import type {
  AIProvider,
  ChatCompletionOptions,
  ChatCompletionResult,
  StreamingCallback,
} from './types'

/**
 * Ollama provider — free local development, runs models on your machine.
 * Install: https://ollama.com
 * Example: `ollama run llama3.2`
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'Ollama'

  constructor(
    readonly model: string,
    private baseUrl = 'http://localhost:11434'
  ) {}

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama error (${response.status}): ${error}`)
    }

    const data = await response.json()

    return {
      content: data.message?.content ?? '',
      model: this.model,
    }
  }

  async chatStream(
    options: ChatCompletionOptions,
    onChunk: StreamingCallback
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama error (${response.status}): ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((l) => l.trim())

        for (const line of lines) {
          try {
            const json = JSON.parse(line)
            const content = json.message?.content ?? ''
            onChunk({ content, done: json.done ?? false })
          } catch {
            // Skip malformed lines
          }
        }
      }
    } finally {
      reader.releaseLock()
      onChunk({ content: '', done: true })
    }
  }
}
