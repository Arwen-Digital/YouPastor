import type { Message } from '@/lib/ai/types'
import type { AIRole } from '@/lib/ai/types'

export interface ExtractedResearch {
  scriptureRef: string
  topicOrAngle?: string
  content: string
}

/**
 * Extract scripture ref, topic, and the full markdown research
 * content directly from the conversation. No AI extraction needed —
 * the research output is the markdown-formatted assistant message.
 */
export async function extractResearchFromConversation(
  messages: Message[],
  _role?: AIRole
): Promise<ExtractedResearch | null> {
  try {
    // Find the research output: the largest assistant message containing
    // markdown research headers (## 1., # Sermon Research, etc.)
    const assistantMsgs = messages
      .filter(m => m.role === 'assistant' && m.content)

    // Priority: message with "# Sermon Research:" or "## 1. Passage Context"
    let researchMsg = assistantMsgs.find(m =>
      m.content.includes('# Sermon Research') ||
      m.content.includes('## 1. Passage Context') ||
      m.content.includes('Passage Context') ||
      m.content.includes('Historical and Cultural Background')
    )

    // Fallback: the longest assistant message (likely the research output)
    if (!researchMsg) {
      researchMsg = assistantMsgs.reduce((longest, m) =>
        m.content.length > longest.content.length ? m : longest
      , assistantMsgs[0])
    }

    if (!researchMsg) {
      console.error('[extractResearch] No assistant messages found')
      return null
    }

    const content = researchMsg.content.trim()

    // Try to extract scriptureRef from the content
    let scriptureRef = ''
    const headerMatch = content.match(/# Sermon Research:\s*(.+?)(?:\n|$)/)
    if (headerMatch) {
      scriptureRef = headerMatch[1].trim().replace(/\*/g, '')
    }

    // Fallback: find a scripture-like pattern in the conversation
    if (!scriptureRef) {
      for (const msg of [...messages].reverse()) {
        const match = msg.content.match(/\b(\d?\s*[A-Za-z]+)\s+(\d+):(\d+)(?:-(\d+))?\b/)
        if (match) {
          scriptureRef = match[0].trim()
          break
        }
      }
    }

    // Try to extract topicOrAngle from RESEARCH_READY or content
    let topicOrAngle = ''
    const readyMatch = content.match(/RESEARCH_READY:\s*Passage:\s*[^.]+\s*\.\s*Topic:\s*([^.]*)/)
    if (readyMatch) {
      topicOrAngle = readyMatch[1].trim()
      if (topicOrAngle === 'Exploring' || topicOrAngle === 'None' || topicOrAngle === 'none') {
        topicOrAngle = ''
      }
    }

    console.log('[extractResearch] Extracted:', { scriptureRef, topicOrAngle, contentLength: content.length })
    return { scriptureRef, topicOrAngle, content }
  } catch (err) {
    console.error('[extractResearch] Extraction failed:', err)
    return null
  }
}
