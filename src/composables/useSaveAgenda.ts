import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import { extractAgendaFromConversation } from '@/lib/extractAgenda'
import type { Message } from '@/lib/ai/types'

export type SaveStatus = 'idle' | 'extracting' | 'preview' | 'saving' | 'saved' | 'error'

export interface AgendaPreview {
  meetingType: string
  content: string
}

export function useSaveAgenda() {
  const status: Ref<SaveStatus> = ref('idle')
  const preview: Ref<AgendaPreview | null> = ref(null)
  const error: Ref<string | null> = ref(null)
  const savedAgendaId: Ref<string | null> = ref(null)

  async function extract(messages: Message[]) {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      const data = extractAgendaFromConversation(messages)
      if (!data) {
        throw new Error('Could not find a completed agenda in the conversation. Make sure the agenda has been generated.')
      }

      preview.value = {
        meetingType: data.meetingType ?? 'Meeting',
        content: data.content ?? '',
      }
      status.value = 'preview'
    } catch (err: any) {
      console.error('[useSaveAgenda] extract failed:', err)
      error.value = err?.message ?? 'Extraction failed'
      status.value = 'error'
    }
  }

  async function save(data: AgendaPreview) {
    status.value = 'saving'
    error.value = null

    try {
      const client = getConvexClient()
      console.log('[useSaveAgenda] Saving agenda to Convex...', { meetingType: data.meetingType, contentLength: data.content.length })
      const agendaId = await client.mutation('agendas/mutations:create' as any, {
        meetingType: data.meetingType,
        content: data.content,
        status: 'draft',
      })

      console.log('[useSaveAgenda] Agenda saved successfully, id:', agendaId)
      savedAgendaId.value = agendaId as string
      status.value = 'saved'
    } catch (err: any) {
      console.error('[useSaveAgenda] save failed:', err)
      error.value = err?.message ?? 'Save failed'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    preview.value = null
    error.value = null
    savedAgendaId.value = null
  }

  return {
    status,
    preview,
    error,
    savedAgendaId,
    extract,
    save,
    reset,
  }
}
