import type {
  AIProvider,
  ChatCompletionOptions,
  ChatCompletionResult,
  StreamingCallback,
  Message,
} from './types'

export class MockProvider implements AIProvider {
  readonly name = 'Mock'

  constructor(readonly model = 'mock') {}

  private getLastUserMessage(messages: Message[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].content
    }
    return ''
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    await new Promise((resolve) => setTimeout(resolve, 800))

    return {
      content: `[Mock response] You asked: "${this.getLastUserMessage(options.messages)}"\n\nThis is a simulated response for UI development. In production, this will be replaced with a real AI model response.`,
      model: this.model,
    }
  }

  async chatStream(
    options: ChatCompletionOptions,
    onChunk: StreamingCallback
  ): Promise<void> {
    const fullResponse = `[Mock response] You asked: "${this.getLastUserMessage(options.messages)}"\n\nThis is a simulated streaming response for UI development.`
    const words = fullResponse.split(' ')

    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      onChunk({
        content: (i > 0 ? ' ' : '') + words[i],
        done: false,
      })
    }

    onChunk({ content: '', done: true })
  }
}
