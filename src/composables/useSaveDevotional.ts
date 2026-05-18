import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import type { Message } from '@/lib/ai/types'
import { useAI } from '@/composables/useAI'

export type SaveStatus = 'idle' | 'extracting' | 'preview' | 'saving' | 'saved' | 'error'

export interface DevotionalPreview {
  scriptureRef: string
  content: string
}

export function useSaveDevotional() {
  const status: Ref<SaveStatus> = ref('idle')
  const preview: Ref<DevotionalPreview | null> = ref(null)
  const error: Ref<string | null> = ref(null)
  const savedDevotionalId: Ref<string | null> = ref(null)

  const { sendMessage } = useAI('orchestrator')

  async function extract(messages: Message[]) {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      // Use the model to extract clean JSON, removing conversational cruft
      const prompt = `Extract the most recent Midweek Devotional draft from the conversation below. 
Return ONLY a valid JSON object with no markdown formatting, no backticks, and no conversational text.
The JSON must have two string keys: "scriptureRef" and "content".
For "content", include ONLY the actual devotional text. EXCLUDE any conversational follow-up questions (like "How does that feel?" or "If you are happy with it") that may appear at the end of the AI's message.

Conversation:
${messages.filter(m => m.role !== 'system').map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}`

      const response = await sendMessage(
        [{ role: 'user', content: prompt }],
        { operation: 'save_extraction', skillSlug: 'midweek-devotional' }
      )

      if (!response?.content) {
        throw new Error('Extraction failed to return a response.')
      }

      // Clean the response and parse JSON
      let cleanJson = response.content.trim()
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\n?/, '').replace(/\n?```$/, '')
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\n?/, '').replace(/\n?```$/, '')
      }
      cleanJson = cleanJson.trim()

      let data: DevotionalPreview
      try {
        data = JSON.parse(cleanJson)
      } catch (e) {
        console.error('[useSaveDevotional] Failed to parse JSON:', cleanJson)
        throw new Error('Could not parse the extracted devotional format.')
      }

      if (!data.content) {
        throw new Error('Could not find a completed devotional in the conversation.')
      }

      preview.value = {
        scriptureRef: data.scriptureRef ?? 'Devotional',
        content: data.content ?? '',
      }
      status.value = 'preview'
    } catch (err: any) {
      console.error('[useSaveDevotional] extract failed:', err)
      error.value = err?.message ?? 'Extraction failed'
      status.value = 'error'
    }
  }

  async function save(data: DevotionalPreview) {
    status.value = 'saving'
    error.value = null

    try {
      const client = getConvexClient()
      console.log('[useSaveDevotional] Saving devotional to Convex...', { scriptureRef: data.scriptureRef, contentLength: data.content.length })
      const devotionalId = await client.mutation('devotionals/mutations:create' as any, {
        scriptureRef: data.scriptureRef,
        content: data.content,
        status: 'draft',
      })

      console.log('[useSaveDevotional] Devotional saved successfully, id:', devotionalId)
      savedDevotionalId.value = devotionalId as string
      status.value = 'saved'
    } catch (err: any) {
      console.error('[useSaveDevotional] save failed:', err)
      error.value = err?.message ?? 'Save failed'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    preview.value = null
    error.value = null
    savedDevotionalId.value = null
  }

  return {
    status,
    preview,
    error,
    savedDevotionalId,
    extract,
    save,
    reset,
  }
}
