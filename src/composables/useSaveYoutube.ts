import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import { extractYoutubeFromConversation } from '@/lib/extractYoutube'
import { useAI } from '@/composables/useAI'
import type { Message } from '@/lib/ai/types'

export type SaveStatus = 'idle' | 'extracting' | 'preview' | 'saving' | 'saved' | 'error'

export interface YoutubePreview {
  title: string
  content: string
  blogId?: string | null
}

export function useSaveYoutube() {
  const status: Ref<SaveStatus> = ref('idle')
  const preview: Ref<YoutubePreview | null> = ref(null)
  const error: Ref<string | null> = ref(null)
  const savedYoutubeId: Ref<string | null> = ref(null)

  const { sendMessage } = useAI('orchestrator')

  async function extract(messages: Message[], blogId?: string | null) {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      const prompt = `Extract ONLY the final Sermon-to-YouTube deliverable from the conversation below.

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "content": "string"
}

Rules:
- content must include only the final relevant YouTube package output
- Keep only final deliverable sections (titles/description/tags/thumbnails/short-form recommendation) that the pastor should keep
- Do NOT include intake Q&A, clarification questions, revision chatter, or stage instructions
- Do NOT include markdown code fences around JSON
- If multiple drafts exist, choose the latest complete final version

Conversation:
${messages.filter(m => m.role !== 'system').map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}`

      const response = await sendMessage([{ role: 'user', content: prompt }], { operation: 'save_extraction', skillSlug: 'sermon-to-youtube' })
      if (!response?.content) throw new Error('Extraction failed to return a response.')

      let cleanJson = response.content.trim()
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\n?/, '').replace(/\n?```$/, '')
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\n?/, '').replace(/\n?```$/, '')
      }
      cleanJson = cleanJson.trim()

      let extracted: { title?: string; content?: string } | null = null
      try {
        extracted = JSON.parse(cleanJson)
      } catch {
        extracted = null
      }

      if (!extracted?.content) {
        extracted = extractYoutubeFromConversation(messages)
      }

      if (!extracted?.content) {
        throw new Error('Could not find a completed YouTube output in the conversation. Make sure the final output has been generated.')
      }

      preview.value = {
        title: extracted.title?.trim() || 'Sermon to YouTube Package',
        content: extracted.content.trim(),
        blogId: blogId ?? null,
      }
      status.value = 'preview'
    } catch (err: any) {
      console.error('[useSaveYoutube] extract failed:', err)
      error.value = err?.message ?? 'Extraction failed'
      status.value = 'error'
    }
  }

  async function save(data: YoutubePreview) {
    status.value = 'saving'
    error.value = null

    try {
      const client = getConvexClient()
      const youtubeId = await client.mutation('youtube/mutations:create' as any, {
        title: data.title,
        content: data.content,
        blogId: data.blogId || undefined,
        status: 'draft',
      })

      savedYoutubeId.value = youtubeId as string
      status.value = 'saved'
    } catch (err: any) {
      console.error('[useSaveYoutube] save failed:', err)
      error.value = err?.message ?? 'Save failed'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    preview.value = null
    error.value = null
    savedYoutubeId.value = null
  }

  return {
    status,
    preview,
    error,
    savedYoutubeId,
    extract,
    save,
    reset,
  }
}
