import type { Message } from '@/lib/ai/types'

function inferTitle(content: string): string {
  const headingMatch = content.match(/^#{1,3}\s+(.+)$/m)
  if (headingMatch?.[1]) return headingMatch[1].trim()
  return 'Church Social Post'
}

function hasPlatformCaptionFormatting(content: string): boolean {
  return (
    /###\s+(Facebook|Instagram|Twitter\/X|Twitter)/i.test(content) ||
    /^>\s+.+/m.test(content)
  )
}

function hasFinalSocialFormatting(content: string): boolean {
  return (
    hasPlatformCaptionFormatting(content) ||
    content.includes('**Selected post type:**') ||
    content.includes('**Image') ||
    content.includes('**Posting Tip')
  )
}

export function extractChurchSocialFromConversation(messages: Message[]): { title: string; content: string } | null {
  const assistantMessages = messages
    .filter((m) => m.role === 'assistant' && m.content.trim().length > 0)
    .map((m) => m.content.trim())

  if (!assistantMessages.length) return null

  // Prefer the latest formatted caption output from the actual chat. This keeps
  // Markdown headings, blockquotes, bullets, and image/posting-tip sections intact.
  const latestPlatformCaptions = [...assistantMessages].reverse().find(hasPlatformCaptionFormatting)
  const latestFormattedOutput = [...assistantMessages].reverse().find(hasFinalSocialFormatting)
  const candidate = latestPlatformCaptions ?? latestFormattedOutput ?? assistantMessages.sort((a, b) => b.length - a.length)[0]

  if (!candidate) return null

  return {
    title: inferTitle(candidate),
    content: candidate,
  }
}
