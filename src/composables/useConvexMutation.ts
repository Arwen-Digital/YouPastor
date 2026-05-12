import { ref, type Ref } from 'vue'
import type { FunctionReference } from 'convex/server'
import { getConvexClient } from '@/lib/convex'

export function useConvexMutation<Mutation extends FunctionReference<'mutation'>>(
  _mutation: Mutation
) {
  const isLoading: Ref<boolean> = ref(false)
  const error: Ref<Error | null> = ref(null)

  async function mutate(args: Mutation['_args']): Promise<Mutation['_returnType'] | null> {
    isLoading.value = true
    error.value = null
    try {
      const client = getConvexClient()
      const result = await client.mutation(_mutation as any, args as any)
      return result as Mutation['_returnType']
    } catch (err) {
      error.value = err as Error
      return null
    } finally {
      isLoading.value = false
    }
  }

  return { mutate, isLoading, error }
}
