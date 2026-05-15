import type { Message } from '@/lib/ai/types'

export interface ExtractedBlogPost {
  title: string
  content: string
}

function stripMarkdownNumbering(line: string): string {
  return line
    .replace(/^#+\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/\s+\(recommended\)$/i, '')
    .replace(/^['"“”]+|['"“”]+$/g, '')
    .trim()
}

function extractTitle(content: string): string {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)

  const h1 = lines.find(line => /^#\s+[^#]/.test(line))
  if (h1) return stripMarkdownNumbering(h1)

  const titleLabel = lines.find(line => /^\*\*Title:?\*\*/i.test(line) || /^Title:/i.test(line))
  if (titleLabel) {
    return stripMarkdownNumbering(titleLabel.replace(/^\*\*Title:?\*\*:?\s*/i, '').replace(/^Title:\s*/i, ''))
  }

  const recommended = lines.find(line => /^\d+[.)]\s+/.test(line) && /recommended/i.test(line))
  if (recommended) return stripMarkdownNumbering(recommended)

  const firstHeading = lines.find(line => /^##\s+/.test(line))
  if (firstHeading) return stripMarkdownNumbering(firstHeading)

  return 'Sermon Blog Post'
}

/**
 * Extract the best blog post output directly from the conversation.
 * Sermon-to-blog builds in stages, so we save the longest substantive assistant
 * response and append the final SEO notes if they were sent separately.
 */
export function extractBlogFromConversation(messages: Message[]): ExtractedBlogPost | null {
  try {
    const assistantMsgs = messages.filter(m => m.role === 'assistant' && m.content?.trim())
    if (assistantMsgs.length === 0) return null

    const contentCandidates = assistantMsgs.filter(m => {
      const content = m.content.toLowerCase()
      return (
        m.content.length > 800 ||
        content.includes('meta description') ||
        content.includes('seo notes') ||
        content.includes('## ')
      )
    })

    const bodyMsg = (contentCandidates.length ? contentCandidates : assistantMsgs)
      .reduce((longest, msg) => msg.content.length > longest.content.length ? msg : longest)

    const body = bodyMsg.content.trim()
    const bodyIndex = assistantMsgs.indexOf(bodyMsg)
    const seoMsg = assistantMsgs.slice(bodyIndex + 1).find(m => /seo notes|primary keyword|keyword density/i.test(m.content))
    const content = seoMsg && seoMsg.content.trim() !== body
      ? `${body}\n\n---\n\n${seoMsg.content.trim()}`
      : body

    return {
      title: extractTitle(content),
      content,
    }
  } catch (err) {
    console.error('[extractBlog] Extraction failed:', err)
    return null
  }
}
