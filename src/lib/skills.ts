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

export function buildSystemPrompt(skillSlug: string): string {
  const foundation = skills['pastor-foundation']
  const skill = skills[skillSlug]

  if (!skill) return foundation

  return `${foundation}\n\n---\n\n${skill}`
}
