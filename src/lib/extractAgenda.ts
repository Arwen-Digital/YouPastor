import type { Message } from '@/lib/ai/types'

export interface ExtractedAgenda {
  meetingType: string
  content: string
}

/**
 * Extract meeting type and the full markdown agenda
 * content directly from the conversation.
 */
export function extractAgendaFromConversation(messages: Message[]): ExtractedAgenda | null {
  try {
    // Find the agenda output: assistant message containing "Agenda" in a header
    const assistantMsgs = messages.filter(m => m.role === 'assistant' && m.content)

    let agendaMsg = assistantMsgs.find(m =>
      m.content.includes('## ') && m.content.includes(' Agenda')
    )

    // Fallback: longest assistant message
    if (!agendaMsg) {
      agendaMsg = assistantMsgs.reduce((longest, m) =>
        m.content.length > longest.content.length ? m : longest
      , assistantMsgs[0])
    }

    if (!agendaMsg) {
      console.error('[extractAgenda] No assistant messages found')
      return null
    }

    const content = agendaMsg.content.trim()

    // Extract meeting type from header (e.g. "## Staff Meeting Agenda")
    let meetingType = 'Meeting'
    const titleMatch = content.match(/##\s+(.+?)\s+Agenda/)
    if (titleMatch) {
      meetingType = titleMatch[1].trim()
    }

    console.log('[extractAgenda] Extracted:', { meetingType, contentLength: content.length })
    return { meetingType, content }
  } catch (err) {
    console.error('[extractAgenda] Extraction failed:', err)
    return null
  }
}
