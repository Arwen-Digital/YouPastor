import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import { extractBrainstormFromConversation } from '@/lib/extractBrainstorm'
import type { Message } from '@/lib/ai/types'

export type SaveStatus = 'idle' | 'extracting' | 'preview' | 'saving' | 'saved' | 'error'

export interface BrainstormPreview {
  passage: string
  bigIdea: string
  seriesId: string | null
  content: string
}

export function useSaveBrainstorm() {
  const status: Ref<SaveStatus> = ref('idle')
  const preview: Ref<BrainstormPreview | null> = ref(null)
  const error: Ref<string | null> = ref(null)
  const savedBriefId: Ref<string | null> = ref(null)

  async function extract(messages: Message[]) {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      const data = extractBrainstormFromConversation(messages)
      if (!data) {
        throw new Error('Could not find a sermon brief in the conversation. Make sure the conversation includes the Expanded Sermon Brief.')
      }

      preview.value = {
        passage: data.passage ?? '',
        bigIdea: data.bigIdea ?? '',
        seriesId: null,
        content: data.content ?? '',
      }
      status.value = 'preview'
    } catch (err: any) {
      console.error('[useSaveBrainstorm] extract failed:', err)
      error.value = err?.message ?? 'Extraction failed'
      status.value = 'error'
    }
  }

  async function save(data: BrainstormPreview) {
    status.value = 'saving'
    error.value = null

    try {
      const client = getConvexClient()
      console.log('[useSaveBrainstorm] Saving brief to Convex...', { passage: data.passage, contentLength: data.content.length })
      const briefId = await client.mutation('brainstorm/mutations:create' as any, {
        passage: data.passage,
        bigIdea: data.bigIdea || undefined,
        seriesId: data.seriesId || undefined,
        content: data.content,
        status: 'draft',
      })

      console.log('[useSaveBrainstorm] Brief saved successfully, id:', briefId)
      savedBriefId.value = briefId as string
      status.value = 'saved'
    } catch (err: any) {
      console.error('[useSaveBrainstorm] save failed:', err)
      error.value = err?.message ?? 'Save failed'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    preview.value = null
    error.value = null
    savedBriefId.value = null
  }

  return {
    status,
    preview,
    error,
    savedBriefId,
    extract,
    save,
    reset,
  }
}
