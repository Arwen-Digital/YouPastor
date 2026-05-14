import foundationPrompt from '../../skills/foundation/pastor-foundation/SKILL.md?raw'
import brainstormPrompt from '../../skills/sermon-prep/sermon-brainstorm/SKILL.md?raw'
import researchPrompt from '../../skills/sermon-prep/sermon-research/SKILL.md?raw'
import seriesPrompt from '../../skills/sermon-prep/sermon-series/SKILL.md?raw'
import blogPrompt from '../../skills/sermon-repurposing/sermon-to-blog/SKILL.md?raw'
import youtubePrompt from '../../skills/sermon-repurposing/sermon-to-youtube/SKILL.md?raw'
import smallGroupPrompt from '../../skills/sermon-repurposing/small-group-questions/SKILL.md?raw'
import socialPostPrompt from '../../skills/social-media/church-social-post/SKILL.md?raw'
import socialCalendarPrompt from '../../skills/social-media/social-media-calendar/SKILL.md?raw'
import emailPrompt from '../../skills/written-communication/church-email/SKILL.md?raw'
import announcementPrompt from '../../skills/written-communication/announcement-script/SKILL.md?raw'
import letterPrompt from '../../skills/written-communication/church-letter/SKILL.md?raw'
import devotionalPrompt from '../../skills/pastoral-rhythm/midweek-devotional/SKILL.md?raw'
import agendaPrompt from '../../skills/pastoral-rhythm/meeting-agenda/SKILL.md?raw'

const skills: Record<string, string> = {
  'pastor-foundation': foundationPrompt,
  'sermon-brainstorm': brainstormPrompt,
  'sermon-research': researchPrompt,
  'sermon-series': seriesPrompt,
  'sermon-to-blog': blogPrompt,
  'sermon-to-youtube': youtubePrompt,
  'small-group-questions': smallGroupPrompt,
  'church-social-post': socialPostPrompt,
  'social-media-calendar': socialCalendarPrompt,
  'church-email': emailPrompt,
  'announcement-script': announcementPrompt,
  'church-letter': letterPrompt,
  'midweek-devotional': devotionalPrompt,
  'meeting-agenda': agendaPrompt,
}

export function getSkillPrompt(slug: string): string {
  return skills[slug] ?? ''
}

export interface ChurchContext {
  churchName?: string
  pastorName?: string
  denomination?: string
  averageAttendance?: string
  location?: string
  bibleTranslation?: string
}

/**
 * Build context block from church profile data.
 * This replaces the foundation's "I need a few details" section
 * with the actual filled-in values so the AI doesn't ask for them.
 */
export function buildContextBlock(context: ChurchContext): string {
  const lines: string[] = []
  lines.push('## Church Context (filled in from profile)')
  lines.push('')
  lines.push('The pastor has already provided their church context. Use these values throughout the conversation:')
  lines.push('')
  lines.push(`CHURCH_NAME: ${context.churchName || 'Not provided'}`)
  lines.push(`PASTOR_NAME: ${context.pastorName || 'Not provided'}`)
  lines.push(`DENOMINATION: ${context.denomination || 'Nondenominational evangelical'}`)
  lines.push(`ATTENDANCE: ${context.averageAttendance || 'Not provided'}`)
  lines.push(`LOCATION: ${context.location || 'Not provided'}`)
  lines.push(`BIBLE_TRANSLATION: ${context.bibleTranslation || 'NIV'}`)
  lines.push('')
  lines.push('Do NOT ask the pastor for these details again. They are already set. Use them directly in your output.')
  return lines.join('\n')
}

export function buildSystemPrompt(skillSlug: string, context?: ChurchContext): string {
  const foundation = skills['pastor-foundation']
  const skill = skills[skillSlug]
  const contextBlock = context ? buildContextBlock(context) : ''

  if (!skill) {
    return contextBlock ? `${contextBlock}\n\n---\n\n${foundation}` : foundation
  }

  const parts = [contextBlock, foundation, skill].filter(Boolean)
  return parts.join('\n\n---\n\n')
}
