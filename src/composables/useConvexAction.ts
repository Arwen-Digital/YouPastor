import { ref, type Ref } from 'vue'
import type { FunctionReference } from 'convex/server'
import { getConvexClient } from '@/lib/convex'

export function useConvexAction<Action extends FunctionReference<'action'>>(
  _action: Action
) {
  const isLoading: Ref<boolean> = ref(false)
  const error: Ref<Error | null> = ref(null)

  async function run(args: Action['_args']): Promise<Action['_returnType'] | null> {
    isLoading.value = true
    error.value = null
    try {
      const client = getConvexClient()
      const result = await client.action(_action as any, args as any)
      return result as Action['_returnType']
    } catch (err) {
      error.value = err as Error
      return null
    } finally {
      isLoading.value = false
    }
  }

  return { run, isLoading, error }
}
