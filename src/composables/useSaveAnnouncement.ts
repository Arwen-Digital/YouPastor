import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import { extractAnnouncementFromConversation } from '@/lib/extractAnnouncement'
import { useAI } from '@/composables/useAI'
import type { Message } from '@/lib/ai/types'

export type SaveStatus = 'idle' | 'extracting' | 'preview' | 'saving' | 'saved' | 'error'

export interface AnnouncementPreview {
  title: string
  content: string
}

export function useSaveAnnouncement() {
  const status: Ref<SaveStatus> = ref('idle')
  const preview: Ref<AnnouncementPreview | null> = ref(null)
  const error: Ref<string | null> = ref(null)
  const savedAnnouncementId: Ref<string | null> = ref(null)

  const { sendMessage } = useAI('orchestrator')

  async function extract(messages: Message[]) {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      const prompt = `Extract ONLY the final Announcement Script deliverable from the conversation below.

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "content": "string"
}

Rules:
- content must include only final output the pastor should keep (triage, spoken script, bumped items/channel notes, final checklist if present)
- Do NOT include intake Q&A, clarifications, revisions chatter, or stage instructions
- Do NOT include markdown code fences around JSON
- If multiple drafts exist, choose the latest complete final version

Conversation:
${messages.filter(m => m.role !== 'system').map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}`

      const response = await sendMessage([{ role: 'user', content: prompt }], { operation: 'save_extraction', skillSlug: 'announcement-script' })
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

      if (!extracted?.content) extracted = extractAnnouncementFromConversation(messages)

      if (!extracted?.content) {
        throw new Error('Could not find completed Announcement Script output in the conversation.')
      }

      preview.value = {
        title: extracted.title?.trim() || 'Announcement Script',
        content: extracted.content.trim(),
      }
      status.value = 'preview'
    } catch (err: any) {
      console.error('[useSaveAnnouncement] extract failed:', err)
      error.value = err?.message ?? 'Extraction failed'
      status.value = 'error'
    }
  }

  async function save(data: AnnouncementPreview) {
    status.value = 'saving'
    error.value = null

    try {
      const client = getConvexClient()
      const announcementId = await client.mutation('announcement/mutations:create' as any, {
        title: data.title,
        content: data.content,
        status: 'draft',
      })

      savedAnnouncementId.value = announcementId as string
      status.value = 'saved'
    } catch (err: any) {
      console.error('[useSaveAnnouncement] save failed:', err)
      error.value = err?.message ?? 'Save failed'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    preview.value = null
    error.value = null
    savedAnnouncementId.value = null
  }

  return { status, preview, error, savedAnnouncementId, extract, save, reset }
}
