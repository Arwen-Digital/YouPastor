import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import { extractBlogFromConversation } from '@/lib/extractBlog'
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

  async function extract(messages: Message[], sermonId?: string | null) {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      const data = extractBlogFromConversation(messages)
      if (!data) {
        throw new Error('Could not find a completed blog post in the conversation. Make sure the blog post body has been generated.')
      }

      preview.value = {
        title: data.title || 'Sermon Blog Post',
        content: data.content || '',
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
