import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import { extractChurchEmailFromConversation } from '@/lib/extractChurchEmail'
import { useAI } from '@/composables/useAI'
import type { Message } from '@/lib/ai/types'

export type SaveStatus = 'idle' | 'extracting' | 'preview' | 'saving' | 'saved' | 'error'

export interface ChurchEmailPreview {
  title: string
  content: string
}

export function useSaveChurchEmail() {
  const status: Ref<SaveStatus> = ref('idle')
  const preview: Ref<ChurchEmailPreview | null> = ref(null)
  const error: Ref<string | null> = ref(null)
  const savedEmailId: Ref<string | null> = ref(null)

  const { sendMessage } = useAI('orchestrator')

  async function extract(messages: Message[]) {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      const prompt = `Extract ONLY the final Church Email deliverable from the conversation below.

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "content": "string"
}

Rules:
- content must include only the final email output the pastor should keep
- Do NOT include intake Q&A, clarifications, revisions chatter, or stage instructions
- Do NOT include markdown code fences around JSON
- If multiple drafts exist, choose the latest complete final version

Conversation:
${messages.filter(m => m.role !== 'system').map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}`

      const response = await sendMessage([{ role: 'user', content: prompt }])
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

      if (!extracted?.content) extracted = extractChurchEmailFromConversation(messages)

      if (!extracted?.content) {
        throw new Error('Could not find completed Church Email output in the conversation.')
      }

      preview.value = {
        title: extracted.title?.trim() || 'Church Email',
        content: extracted.content.trim(),
      }
      status.value = 'preview'
    } catch (err: any) {
      console.error('[useSaveChurchEmail] extract failed:', err)
      error.value = err?.message ?? 'Extraction failed'
      status.value = 'error'
    }
  }

  async function save(data: ChurchEmailPreview) {
    status.value = 'saving'
    error.value = null

    try {
      const client = getConvexClient()
      const emailId = await client.mutation('churchEmail/mutations:create' as any, {
        title: data.title,
        content: data.content,
        status: 'draft',
      })

      savedEmailId.value = emailId as string
      status.value = 'saved'
    } catch (err: any) {
      console.error('[useSaveChurchEmail] save failed:', err)
      error.value = err?.message ?? 'Save failed'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    preview.value = null
    error.value = null
    savedEmailId.value = null
  }

  return { status, preview, error, savedEmailId, extract, save, reset }
}
