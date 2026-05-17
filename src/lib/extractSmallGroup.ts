import type { Message } from '@/lib/ai/types'

function inferTitle(content: string): string {
  const headingMatch = content.match(/^#{1,3}\s+(.+)$/m)
  if (headingMatch?.[1]) return headingMatch[1].trim()
  return 'Small Group Questions'
}

export function extractSmallGroupFromConversation(messages: Message[]): { title: string; content: string } | null {
  const assistantMessages = messages
    .filter((m) => m.role === 'assistant' && m.content.trim().length > 0)
    .map((m) => m.content.trim())

  if (!assistantMessages.length) return null

  const candidate = assistantMessages
    .sort((a, b) => b.length - a.length)[0]

  if (!candidate) return null

  return {
    title: inferTitle(candidate),
    content: candidate,
  }
}
