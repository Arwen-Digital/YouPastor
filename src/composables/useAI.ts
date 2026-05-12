import { ref, type Ref } from 'vue'
import type {
  AIRole,
  ChatCompletionOptions,
  ChatCompletionResult,
  Message,
} from '@/lib/ai/types'
import { getProviderForRole } from '@/lib/ai/factory'

export function useAI(role: AIRole = 'orchestrator') {
  const isLoading = ref(false)
  const error: Ref<Error | null> = ref(null)
  const streamingContent = ref('')

  async function sendMessage(
    messages: Message[],
    options?: Omit<ChatCompletionOptions, 'messages'>
  ): Promise<ChatCompletionResult | null> {
    isLoading.value = true
    error.value = null
    try {
      const provider = getProviderForRole(role)
      console.log('[useAI] Using provider:', provider.name, 'model:', provider.model)
      const result = await provider.chat({ messages, ...options })
      console.log('[useAI] Result → content length:', result.content.length, 'model:', result.model)
      if (!result.content.trim()) {
        throw new Error('AI returned an empty response. The model may be overloaded or unavailable. Try again or switch models in Settings.')
      }
      return result
    } catch (err) {
      console.error('[useAI] sendMessage error:', err)
      error.value = err instanceof Error ? err : new Error(String(err))
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function streamMessage(
    messages: Message[],
    options?: Omit<ChatCompletionOptions, 'messages'>,
    onChunk?: (content: string) => void
  ): Promise<void> {
    isLoading.value = true
    error.value = null
    streamingContent.value = ''

    try {
      const provider = getProviderForRole(role)
      console.log('[useAI] Stream using provider:', provider.name, 'model:', provider.model)
      await provider.chatStream(
        { messages, ...options },
        (chunk) => {
          if (chunk.content) {
            streamingContent.value += chunk.content
            onChunk?.(chunk.content)
          }
        }
      )
      if (!streamingContent.value.trim()) {
        throw new Error('AI returned an empty response. The model may be overloaded or unavailable. Try again or switch models in Settings.')
      }
    } catch (err) {
      console.error('[useAI] streamMessage error:', err)
      error.value = err instanceof Error ? err : new Error(String(err))
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    streamingContent,
    sendMessage,
    streamMessage,
  }
}
