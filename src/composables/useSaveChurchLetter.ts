import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import { extractChurchLetterFromConversation } from '@/lib/extractChurchLetter'
import { useAI } from '@/composables/useAI'
import type { Message } from '@/lib/ai/types'

export type SaveStatus = 'idle' | 'extracting' | 'preview' | 'saving' | 'saved' | 'error'

export interface ChurchLetterPreview {
  title: string
  content: string
}

export function useSaveChurchLetter() {
  const status: Ref<SaveStatus> = ref('idle')
  const preview: Ref<ChurchLetterPreview | null> = ref(null)
  const error: Ref<string | null> = ref(null)
  const savedLetterId: Ref<string | null> = ref(null)

  const { sendMessage } = useAI('orchestrator')

  async function extract(messages: Message[]) {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      const prompt = `Extract ONLY the final Church Letter deliverable from the conversation below.

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "content": "string"
}

Rules:
- content must include only final letter output the pastor should keep
- Do NOT include intake Q&A, clarifications, revision chatter, or stage instructions
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

      if (!extracted?.content) extracted = extractChurchLetterFromConversation(messages)

      if (!extracted?.content) {
        throw new Error('Could not find completed Church Letter output in the conversation.')
      }

      preview.value = {
        title: extracted.title?.trim() || 'Church Letter',
        content: extracted.content.trim(),
      }
      status.value = 'preview'
    } catch (err: any) {
      console.error('[useSaveChurchLetter] extract failed:', err)
      error.value = err?.message ?? 'Extraction failed'
      status.value = 'error'
    }
  }

  async function save(data: ChurchLetterPreview) {
    status.value = 'saving'
    error.value = null

    try {
      const client = getConvexClient()
      const letterId = await client.mutation('churchLetter/mutations:create' as any, {
        title: data.title,
        content: data.content,
        status: 'draft',
      })

      savedLetterId.value = letterId as string
      status.value = 'saved'
    } catch (err: any) {
      console.error('[useSaveChurchLetter] save failed:', err)
      error.value = err?.message ?? 'Save failed'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    preview.value = null
    error.value = null
    savedLetterId.value = null
  }

  return { status, preview, error, savedLetterId, extract, save, reset }
}
