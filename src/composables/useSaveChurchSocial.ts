import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import { extractChurchSocialFromConversation } from '@/lib/extractChurchSocial'
import { useAI } from '@/composables/useAI'
import type { Message } from '@/lib/ai/types'

export type SaveStatus = 'idle' | 'extracting' | 'preview' | 'saving' | 'saved' | 'error'

export interface ChurchSocialPreview {
  title: string
  content: string
}

function hasSocialPostFormatting(content?: string | null): boolean {
  if (!content) return false
  return /###\s+(Facebook|Instagram|Twitter\/X|Twitter)/i.test(content) || /^>\s+.+/m.test(content)
}

export function useSaveChurchSocial() {
  const status: Ref<SaveStatus> = ref('idle')
  const preview: Ref<ChurchSocialPreview | null> = ref(null)
  const error: Ref<string | null> = ref(null)
  const savedPostId: Ref<string | null> = ref(null)

  const { sendMessage } = useAI('orchestrator')

  async function extract(messages: Message[]) {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      const prompt = `Extract ONLY the final Church Social Post deliverable from the conversation below.

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "content": "string"
}

Rules:
- content must include only final deliverables the pastor should keep (post type selection, platform captions, image suggestions, and posting tip if present)
- Preserve the Markdown formatting exactly from the chat, especially platform headings, blockquoted captions, bullets, bold labels, and posting tip italics
- Do NOT convert formatted captions into plain paragraphs or remove Markdown blockquotes
- Do NOT include intake Q&A, clarifications, revisions chatter, or staging instructions
- Do NOT include markdown code fences around JSON
- If there are multiple drafts, pick the latest complete final version

Conversation:
${messages.filter(m => m.role !== 'system').map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}`

      const response = await sendMessage([{ role: 'user', content: prompt }], { operation: 'save_extraction', skillSlug: 'church-social-post' })
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

      if (!hasSocialPostFormatting(extracted?.content)) {
        const directExtraction = extractChurchSocialFromConversation(messages)
        if (directExtraction?.content) extracted = directExtraction
      }

      if (!extracted?.content) {
        throw new Error('Could not find completed Church Social Post output in the conversation.')
      }

      preview.value = {
        title: extracted.title?.trim() || 'Church Social Post',
        content: extracted.content.trim(),
      }
      status.value = 'preview'
    } catch (err: any) {
      console.error('[useSaveChurchSocial] extract failed:', err)
      error.value = err?.message ?? 'Extraction failed'
      status.value = 'error'
    }
  }

  async function save(data: ChurchSocialPreview) {
    status.value = 'saving'
    error.value = null

    try {
      const client = getConvexClient()
      const postId = await client.mutation('churchSocial/mutations:create' as any, {
        title: data.title,
        content: data.content,
        status: 'draft',
      })

      savedPostId.value = postId as string
      status.value = 'saved'
    } catch (err: any) {
      console.error('[useSaveChurchSocial] save failed:', err)
      error.value = err?.message ?? 'Save failed'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    preview.value = null
    error.value = null
    savedPostId.value = null
  }

  return { status, preview, error, savedPostId, extract, save, reset }
}
