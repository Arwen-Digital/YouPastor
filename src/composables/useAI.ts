import { ref, type Ref } from 'vue'
import type {
  AIRole,
  AIOperation,
  ChatCompletionOptions,
  ChatCompletionResult,
  Message,
} from '@/lib/ai/types'
import { getConvexClient } from '@/lib/convex'
import { useAuthStore } from '@/stores/auth'

export function useAI(initialRole: AIRole = 'orchestrator') {
  const auth = useAuthStore()
  const isLoading = ref(false)
  const error: Ref<Error | null> = ref(null)
  const streamingContent = ref('')
  const citations = ref<string[]>([])

  const role = ref<AIRole>(initialRole)

  function setRole(newRole: AIRole) {
    if (role.value !== newRole) {
      role.value = newRole
      console.log('[useAI] Role switched to:', newRole)
    }
  }

  function resolveOperation(options?: Omit<ChatCompletionOptions, 'messages'>): AIOperation {
    return (options?.operation ?? 'orchestrator_intake') as AIOperation
  }

  async function sendMessage(
    messages: Message[],
    options?: Omit<ChatCompletionOptions, 'messages'>
  ): Promise<ChatCompletionResult | null> {
    isLoading.value = true
    error.value = null
    try {
      console.log('[useAI] Using backend OpenRouter role:', role.value)

      const client = getConvexClient()
      const actionResult = await client.action('ai/actions:chat' as any, {
        operation: resolveOperation(options),
        skillSlug: options?.skillSlug,
        modelRole: role.value,
        messages,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      })

      const result: ChatCompletionResult = {
        content: actionResult?.content ?? '',
        citations: actionResult?.citations,
        model: actionResult?.model ?? role.value,
        creditsCharged: actionResult?.creditsCharged,
        remainingCredits: actionResult?.remainingCredits,
        providerCostUsdMicros: actionResult?.providerCostUsdMicros,
      }

      if (typeof actionResult?.remainingCredits === 'number') {
        auth.setCreditBalance(actionResult.remainingCredits)
      }

      console.log(
        '[useAI] Result → content length:',
        result.content.length,
        'model:',
        result.model,
        'creditsCharged:',
        result.creditsCharged ?? 'n/a'
      )

      if (!result.content.trim()) {
        throw new Error(
          'AI returned an empty response. The model may be overloaded or unavailable. Try again or switch models in Settings.'
        )
      }

      if (result.citations && result.citations.length > 0) {
        citations.value = result.citations
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
    citations.value = []

    try {
      const result = await sendMessage(messages, options)
      if (!result) return

      streamingContent.value = result.content
      onChunk?.(result.content)

      if (!streamingContent.value.trim()) {
        throw new Error(
          'AI returned an empty response. The model may be overloaded or unavailable. Try again or switch models in Settings.'
        )
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
    citations,
    role,
    setRole,
    sendMessage,
    streamMessage,
  }
}
