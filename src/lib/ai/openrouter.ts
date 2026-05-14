import type {
  AIProvider,
  ChatCompletionOptions,
  ChatCompletionResult,
  StreamingCallback,
} from './types'

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 60000
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetchWithTimeout(url, options)

    if (response.status === 429 && attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 2000
      console.log(`[OpenRouter] Rate limited. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`)
      await sleep(delay)
      continue
    }

    return response
  }

  throw new Error('Max retries exceeded for rate-limited request')
}

export class OpenRouterProvider implements AIProvider {
  readonly name = 'OpenRouter'

  constructor(
    readonly model: string,
    private apiKey: string,
    private baseUrl = 'https://openrouter.ai/api/v1'
  ) {}

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://youpastor.app',
      'X-Title': 'YouPastor',
    }
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const payload = {
      model: this.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
    }
    console.log('[OpenRouter] Request →', this.model, payload)

    const response = await fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log('[OpenRouter] Raw response status:', response.status)
    console.log('[OpenRouter] Raw response body:', responseText.slice(0, 2000))

    if (!response.ok) {
      throw new Error(`OpenRouter error (${response.status}): ${responseText}`)
    }

    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (parseErr) {
      throw new Error(`OpenRouter JSON parse error: ${parseErr}. Body: ${responseText.slice(0, 500)}`)
    }

    const choice = data.choices?.[0]
    const content = choice?.message?.content ?? ''
    const finishReason = choice?.finish_reason

    console.log('[OpenRouter] Parsed content length:', content.length, 'finish_reason:', finishReason, 'hasError:', !!data.error)

    if (data.error) {
      throw new Error(`OpenRouter API error: ${JSON.stringify(data.error)}`)
    }

    if (!content.trim()) {
      throw new Error(
        `AI returned empty content (finish_reason: ${finishReason ?? 'unknown'}). ` +
        `This usually means the model is overloaded, rate-limited, or your OpenRouter account needs credits. ` +
        `Try a different model or check your OpenRouter dashboard.`
      )
    }

    // Extract citations from Perplexity/Sonar responses
    // OpenRouter passes through Perplexity's citations array at the top level
    const citations: string[] = data.citations ?? choice?.message?.citations ?? []

    return {
      content,
      citations: citations.length > 0 ? citations : undefined,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      model: data.model ?? this.model,
    }
  }

  async chatStream(
    options: ChatCompletionOptions,
    onChunk: StreamingCallback
  ): Promise<void> {
    const response = await fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter error (${response.status}): ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6))
              const delta = json.choices?.[0]?.delta?.content ?? ''
              onChunk({ content: delta, done: false })
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
      onChunk({ content: '', done: true })
    }
  }
}