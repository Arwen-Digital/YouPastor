import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import { extractResearchFromConversation } from '@/lib/extractResearch'
import type { Message } from '@/lib/ai/types'
import type { AIRole } from '@/lib/ai/types'

export type SaveStatus = 'idle' | 'extracting' | 'preview' | 'saving' | 'saved' | 'error'

export interface ResearchPreview {
  scriptureRef: string
  topicOrAngle: string
  seriesId: string | null
  content: string
}

export function useSaveResearch() {
  const status: Ref<SaveStatus> = ref('idle')
  const preview: Ref<ResearchPreview | null> = ref(null)
  const error: Ref<string | null> = ref(null)
  const savedNoteId: Ref<string | null> = ref(null)

  async function extract(messages: Message[], role: AIRole = 'researcher') {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      const data = await extractResearchFromConversation(messages, role)
      if (!data) {
        throw new Error('Could not find research output in the conversation. Make sure the conversation includes the full research results.')
      }

      preview.value = {
        scriptureRef: data.scriptureRef ?? '',
        topicOrAngle: data.topicOrAngle ?? '',
        seriesId: null,
        content: data.content ?? '',
      }
      status.value = 'preview'
    } catch (err: any) {
      console.error('[useSaveResearch] extract failed:', err)
      error.value = err?.message ?? 'Extraction failed'
      status.value = 'error'
    }
  }

  async function save(data: ResearchPreview) {
    status.value = 'saving'
    error.value = null

    try {
      const client = getConvexClient()
      console.log('[useSaveResearch] Saving research note to Convex...', { scriptureRef: data.scriptureRef, contentLength: data.content.length })
      const noteId = await client.mutation('research/mutations:create' as any, {
        scriptureRef: data.scriptureRef,
        topicOrAngle: data.topicOrAngle || undefined,
        seriesId: data.seriesId || undefined,
        content: data.content,
        status: 'draft',
      })

      console.log('[useSaveResearch] Research note saved successfully, id:', noteId)
      savedNoteId.value = noteId as string
      status.value = 'saved'
    } catch (err: any) {
      console.error('[useSaveResearch] save failed:', err)
      error.value = err?.message ?? 'Save failed'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    preview.value = null
    error.value = null
    savedNoteId.value = null
  }

  return {
    status,
    preview,
    error,
    savedNoteId,
    extract,
    save,
    reset,
  }
}
