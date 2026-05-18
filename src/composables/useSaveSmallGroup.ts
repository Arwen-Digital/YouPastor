import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import { extractSmallGroupFromConversation } from '@/lib/extractSmallGroup'
import { useAI } from '@/composables/useAI'
import type { Message } from '@/lib/ai/types'

export type SaveStatus = 'idle' | 'extracting' | 'preview' | 'saving' | 'saved' | 'error'

export interface SmallGroupPreview {
  title: string
  content: string
  sermonId?: string | null
}

export function useSaveSmallGroup() {
  const status: Ref<SaveStatus> = ref('idle')
  const preview: Ref<SmallGroupPreview | null> = ref(null)
  const error: Ref<string | null> = ref(null)
  const savedGuideId: Ref<string | null> = ref(null)

  const { sendMessage } = useAI('orchestrator')

  async function extract(messages: Message[], sermonId?: string | null) {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      const prompt = `Extract ONLY the final Small Group Questions deliverable from the conversation below.

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "content": "string"
}

Rules:
- content must include only the final small-group output (icebreaker, questions, application, prayer prompts if present)
- Do NOT include intake Q&A, clarifications, or planning chatter
- Do NOT include markdown code fences around JSON
- If there are multiple drafts, pick the latest complete final version

Conversation:
${messages.filter(m => m.role !== 'system').map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}`

      const response = await sendMessage([{ role: 'user', content: prompt }], { operation: 'save_extraction', skillSlug: 'small-group-questions' })
      if (!response?.content) throw new Error('Extraction failed to return a response.')

      let cleanJson = response.content.trim()
      if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json\n?/, '').replace(/\n?```$/, '')
      else if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```\n?/, '').replace(/\n?```$/, '')
      cleanJson = cleanJson.trim()

      let extracted: { title?: string; content?: string } | null = null
      try {
        extracted = JSON.parse(cleanJson)
      } catch {
        extracted = null
      }

      if (!extracted?.content) extracted = extractSmallGroupFromConversation(messages)

      if (!extracted?.content) {
        throw new Error('Could not find completed Small Group Questions in the conversation.')
      }

      preview.value = {
        title: extracted.title?.trim() || 'Small Group Questions',
        content: extracted.content.trim(),
        sermonId: sermonId ?? null,
      }
      status.value = 'preview'
    } catch (err: any) {
      console.error('[useSaveSmallGroup] extract failed:', err)
      error.value = err?.message ?? 'Extraction failed'
      status.value = 'error'
    }
  }

  async function save(data: SmallGroupPreview) {
    status.value = 'saving'
    error.value = null

    try {
      const client = getConvexClient()
      const guideId = await client.mutation('smallGroup/mutations:create' as any, {
        title: data.title,
        content: data.content,
        sermonId: data.sermonId || undefined,
        status: 'draft',
      })

      savedGuideId.value = guideId as string
      status.value = 'saved'
    } catch (err: any) {
      console.error('[useSaveSmallGroup] save failed:', err)
      error.value = err?.message ?? 'Save failed'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    preview.value = null
    error.value = null
    savedGuideId.value = null
  }

  return { status, preview, error, savedGuideId, extract, save, reset }
}
