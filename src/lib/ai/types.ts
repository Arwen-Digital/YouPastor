export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  messages: Message[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface ChatCompletionResult {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
}

export interface StreamingChunk {
  content: string
  done: boolean
}

export type StreamingCallback = (chunk: StreamingChunk) => void

export type AIRole = 'orchestrator' | 'generator' | 'researcher'

export interface AIProvider {
  readonly name: string
  readonly model: string

  chat(options: ChatCompletionOptions): Promise<ChatCompletionResult>

  chatStream(
    options: ChatCompletionOptions,
    onChunk: StreamingCallback
  ): Promise<void>
}

export type ProviderType = 'openrouter' | 'ollama' | 'mock'

export interface ProviderConfig {
  type: ProviderType
  apiKey?: string
  baseUrl?: string
  model: string
}
