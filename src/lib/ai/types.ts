export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AIRole = 'orchestrator' | 'generator' | 'researcher'

export type AIOperation =
  | 'orchestrator_intake'
  | 'sermon_research'
  | 'sermon_brainstorm'
  | 'series_plan'
  | 'sermon_to_blog'
  | 'sermon_to_youtube'
  | 'sermon_companion'
  | 'small_group_questions'
  | 'church_social_post'
  | 'social_media_calendar'
  | 'church_email'
  | 'announcement_script'
  | 'church_letter'
  | 'meeting_agenda'
  | 'midweek_devotional'
  | 'save_extraction'

export interface ChatCompletionOptions {
  messages: Message[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
  operation?: AIOperation
  skillSlug?: string
}

export interface ChatCompletionResult {
  content: string
  citations?: string[]
  model: string
  creditsCharged?: number
  remainingCredits?: number
  providerCostUsdMicros?: number
}

export interface StreamingChunk {
  content: string
  done: boolean
}

export type StreamingCallback = (chunk: StreamingChunk) => void

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
