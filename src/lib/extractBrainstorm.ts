import type { Message } from '@/lib/ai/types'

export interface ExtractedBrainstorm {
  passage: string
  bigIdea: string
  content: string
}

/**
 * Extract passage, big idea, and the full markdown brief
 * content directly from the conversation. No AI extraction needed —
 * the brief is the markdown-formatted assistant message.
 */
export function extractBrainstormFromConversation(messages: Message[]): ExtractedBrainstorm | null {
  try {
    // Find the brief output: assistant message containing "## Sermon Brief"
    const assistantMsgs = messages.filter(m => m.role === 'assistant' && m.content)

    let briefMsg = assistantMsgs.find(m =>
      m.content.includes('## Sermon Brief') ||
      m.content.includes('### Your Core Message')
    )

    // Fallback: longest assistant message
    if (!briefMsg) {
      briefMsg = assistantMsgs.reduce((longest, m) =>
        m.content.length > longest.content.length ? m : longest
      , assistantMsgs[0])
    }

    if (!briefMsg) {
      console.error('[extractBrainstorm] No assistant messages found')
      return null
    }

    const content = briefMsg.content.trim()

    // Extract passage from header
    let passage = ''
    const passageMatch = content.match(/\*\*Passage:\*\*\s*(.+?)(?:\n|$)/)
    if (passageMatch) {
      passage = passageMatch[1].trim()
    }

    // Extract big idea from brief
    let bigIdea = ''
    const bigIdeaMatch = content.match(/\*\*Big Idea:\*\*\s*(.+?)(?:\n|$)/)
    if (bigIdeaMatch) {
      bigIdea = bigIdeaMatch[1].trim()
    }

    // Fallback: find scripture pattern
    if (!passage) {
      for (const msg of [...messages].reverse()) {
        const match = msg.content.match(/\b(\d?\s*[A-Za-z]+)\s+(\d+):(\d+)(?:-(\d+))?\b/)
        if (match) {
          passage = match[0].trim()
          break
        }
      }
    }

    console.log('[extractBrainstorm] Extracted:', { passage, bigIdea, contentLength: content.length })
    return { passage, bigIdea, content }
  } catch (err) {
    console.error('[extractBrainstorm] Extraction failed:', err)
    return null
  }
}
