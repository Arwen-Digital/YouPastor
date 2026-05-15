import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import { extractBlogFromConversation } from '@/lib/extractBlog'
import { useAI } from '@/composables/useAI'
import type { Message } from '@/lib/ai/types'

export type SaveStatus = 'idle' | 'extracting' | 'preview' | 'saving' | 'saved' | 'error'

export interface BlogPreview {
  title: string
  content: string
  sermonId?: string | null
}

export function useSaveBlog() {
  const status: Ref<SaveStatus> = ref('idle')
  const preview: Ref<BlogPreview | null> = ref(null)
  const error: Ref<string | null> = ref(null)
  const savedBlogId: Ref<string | null> = ref(null)

  const { sendMessage } = useAI('orchestrator')

  async function extract(messages: Message[], sermonId?: string | null) {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      const prompt = `Extract ONLY the final Sermon-to-Blog deliverable from the conversation below.

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "content": "string"
}

Rules:
- content must include only the final blog result (article body, and final SEO notes if present)
- Do NOT include intake Q&A, clarification questions, stage instructions, option lists that were not selected, or conversational follow-ups
- Do NOT include markdown code fences around JSON
- If there are multiple drafts, pick the latest complete final version

Conversation:
${messages.filter(m => m.role !== 'system').map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}`

      const response = await sendMessage([{ role: 'user', content: prompt }])

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

      // Fallback to deterministic extractor if model JSON parse fails
      if (!extracted?.content) {
        extracted = extractBlogFromConversation(messages)
      }

      if (!extracted?.content) {
        throw new Error('Could not find a completed blog post in the conversation. Make sure the final blog output has been generated.')
      }

      preview.value = {
        title: extracted.title?.trim() || 'Sermon Blog Post',
        content: extracted.content.trim(),
        sermonId: sermonId ?? null,
      }
      status.value = 'preview'
    } catch (err: any) {
      console.error('[useSaveBlog] extract failed:', err)
      error.value = err?.message ?? 'Extraction failed'
      status.value = 'error'
    }
  }

  async function save(data: BlogPreview) {
    status.value = 'saving'
    error.value = null

    try {
      const client = getConvexClient()
      const blogId = await client.mutation('blogs/mutations:create' as any, {
        title: data.title,
        content: data.content,
        sermonId: data.sermonId || undefined,
        status: 'draft',
      })

      savedBlogId.value = blogId as string
      status.value = 'saved'
    } catch (err: any) {
      console.error('[useSaveBlog] save failed:', err)
      error.value = err?.message ?? 'Save failed'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    preview.value = null
    error.value = null
    savedBlogId.value = null
  }

  return {
    status,
    preview,
    error,
    savedBlogId,
    extract,
    save,
    reset,
  }
}
