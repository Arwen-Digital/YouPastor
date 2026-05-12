import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import type { FunctionReference } from 'convex/server'
import { getConvexClient } from '@/lib/convex'

export function useConvexQuery<Query extends FunctionReference<'query'>>(
  query: Query,
  args: Query['_args'] = {} as Query['_args']
) {
  const result: Ref<Query['_returnType'] | undefined> = ref(undefined)
  const error: Ref<Error | null> = ref(null)
  const isLoading = ref(true)
  let unsubscribe: (() => void) | null = null

  function subscribe() {
    try {
      const client = getConvexClient()
      const unsub = client.onUpdate(query as any, args as any, (value: any) => {
        result.value = value
        isLoading.value = false
        error.value = null
      })
      return () => unsub.unsubscribe()
    } catch (err) {
      error.value = err as Error
      isLoading.value = false
      return null
    }
  }

  onMounted(() => {
    unsubscribe = subscribe()
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  return { result, error, isLoading }
}
