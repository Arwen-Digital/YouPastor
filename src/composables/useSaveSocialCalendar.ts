import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import { extractSocialCalendarFromConversation } from '@/lib/extractSocialCalendar'
import { useAI } from '@/composables/useAI'
import type { Message } from '@/lib/ai/types'

export type SaveStatus = 'idle' | 'extracting' | 'preview' | 'saving' | 'saved' | 'error'

export interface SocialCalendarPreview {
  title: string
  content: string
}

function hasSocialCalendarTable(content?: string | null): boolean {
  if (!content) return false
  return /\|\s*Date\s*\|\s*Day\s*\|\s*Platform\s*\|\s*Post Type\s*\|/i.test(content)
}

export function useSaveSocialCalendar() {
  const status: Ref<SaveStatus> = ref('idle')
  const preview: Ref<SocialCalendarPreview | null> = ref(null)
  const error: Ref<string | null> = ref(null)
  const savedCalendarId: Ref<string | null> = ref(null)

  const { sendMessage } = useAI('orchestrator')

  async function extract(messages: Message[]) {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      const prompt = `Extract ONLY the final Social Media Calendar deliverable from the conversation below.

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "content": "string"
}

Rules:
- content must include only final calendar deliverables the pastor should keep
- Preserve Markdown formatting exactly, especially the social media calendar table
- The content string should include the Markdown table with columns: Date, Day, Platform, Post Type, Topic and Content Idea, CTA
- Do NOT convert the Markdown table into prose, bullet points, CSV, or plain text rows
- Do NOT include intake Q&A, clarifications, revision chatter, or stage instructions
- Do NOT include markdown code fences around JSON
- If multiple drafts exist, choose the latest complete final version

Conversation:
${messages.filter(m => m.role !== 'system').map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}`

      const response = await sendMessage([{ role: 'user', content: prompt }], { operation: 'save_extraction', skillSlug: 'social-media-calendar' })
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

      if (!hasSocialCalendarTable(extracted?.content)) {
        const directExtraction = extractSocialCalendarFromConversation(messages)
        if (directExtraction?.content) extracted = directExtraction
      }

      if (!extracted?.content) {
        throw new Error('Could not find completed Social Media Calendar output in the conversation.')
      }

      preview.value = {
        title: extracted.title?.trim() || 'Social Media Calendar',
        content: extracted.content.trim(),
      }
      status.value = 'preview'
    } catch (err: any) {
      console.error('[useSaveSocialCalendar] extract failed:', err)
      error.value = err?.message ?? 'Extraction failed'
      status.value = 'error'
    }
  }

  async function save(data: SocialCalendarPreview) {
    status.value = 'saving'
    error.value = null

    try {
      const client = getConvexClient()
      const calendarId = await client.mutation('socialCalendar/mutations:create' as any, {
        title: data.title,
        content: data.content,
        status: 'draft',
      })

      savedCalendarId.value = calendarId as string
      status.value = 'saved'
    } catch (err: any) {
      console.error('[useSaveSocialCalendar] save failed:', err)
      error.value = err?.message ?? 'Save failed'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    preview.value = null
    error.value = null
    savedCalendarId.value = null
  }

  return { status, preview, error, savedCalendarId, extract, save, reset }
}
