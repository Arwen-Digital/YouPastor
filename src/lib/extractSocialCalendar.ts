import type { Message } from '@/lib/ai/types'

function inferTitle(content: string): string {
  const headingMatch = content.match(/^#{1,3}\s+(.+)$/m)
  if (headingMatch?.[1]) return headingMatch[1].trim()
  return 'Social Media Calendar'
}

function hasCalendarTable(content: string): boolean {
  return /\|\s*Date\s*\|\s*Day\s*\|\s*Platform\s*\|\s*Post Type\s*\|/i.test(content)
}

export function extractSocialCalendarFromConversation(messages: Message[]): { title: string; content: string } | null {
  const assistantMessages = messages
    .filter((m) => m.role === 'assistant' && m.content.trim().length > 0)
    .map((m) => m.content.trim())

  if (!assistantMessages.length) return null

  const candidateWithTable = [...assistantMessages].reverse().find(hasCalendarTable)
  const candidate = candidateWithTable ?? assistantMessages.sort((a, b) => b.length - a.length)[0]
  if (!candidate) return null

  return {
    title: inferTitle(candidate),
    content: candidate,
  }
}
