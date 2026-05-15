import type { Message } from '@/lib/ai/types'

export interface ExtractedYoutubeDraft {
  title: string
  content: string
}

function cleanTitle(text: string): string {
  return text
    .replace(/^#+\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/\s+\(recommended\)$/i, '')
    .trim()
}

function pickTitle(content: string): string {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const heading = lines.find(l => /^#\s+/.test(l))
  if (heading) return cleanTitle(heading)

  const titleLine = lines.find(l => /^\*\*Title/i.test(l) || /^Title:/i.test(l))
  if (titleLine) return cleanTitle(titleLine.replace(/^\*\*Title:?\*\*:?\s*/i, '').replace(/^Title:\s*/i, ''))

  const recommended = lines.find(l => /^\d+[.)]\s+/.test(l) && /recommended/i.test(l))
  if (recommended) return cleanTitle(recommended)

  return 'Sermon to YouTube Package'
}

export function extractYoutubeFromConversation(messages: Message[]): ExtractedYoutubeDraft | null {
  try {
    const assistantMsgs = messages.filter(m => m.role === 'assistant' && m.content?.trim())
    if (!assistantMsgs.length) return null

    const candidates = assistantMsgs.filter(m => {
      const c = m.content.toLowerCase()
      return (
        c.includes('title options') ||
        c.includes('description') ||
        c.includes('tags') ||
        c.includes('thumbnail') ||
        c.includes('short-form clip') ||
        m.content.length > 900
      )
    })

    const best = (candidates.length ? candidates : assistantMsgs)
      .reduce((longest, msg) => msg.content.length > longest.content.length ? msg : longest)

    const content = best.content.trim()
    return {
      title: pickTitle(content),
      content,
    }
  } catch (err) {
    console.error('[extractYoutube] Extraction failed:', err)
    return null
  }
}
