import type { Message } from '@/lib/ai/types'
import type { AIRole } from '@/lib/ai/types'
import { getConvexClient } from '@/lib/convex'

/**
 * Shape of the extracted series data from a conversation.
 */
export interface ExtractedSeries {
  title: string
  tagline?: string
  scopeAssessment?: string
  seriesArc?: string
  durationCheck?: string
  specialAttention?: string
  launchRecommendation?: string
  description?: string
  weeks?: {
    weekNumber: number
    sermonTitle?: string
    scriptureRef?: string
    bigIdea?: string
    connectiveThread?: string
  }[]
}

const EXTRACTION_PROMPT = `You are a data extraction assistant. Your job is to extract structured series plan data from a conversation between a pastor and an AI sermon series planner.

Read the conversation below and extract the series plan information into a JSON object. Follow these rules:

1. Only include information that was explicitly discussed or generated during the conversation.
2. If a field was never discussed, omit it entirely (do not make up values).
3. For the "weeks" array, only include weeks that were actually planned in the conversation. Each week must have a weekNumber starting from 1.
4. The "title" field is required. If no clear title was chosen, use the best title mentioned.
5. Return ONLY valid JSON — no markdown, no commentary, no explanation, just the JSON object.

The expected JSON shape:
{
  "title": "Series Title",
  "tagline": "Optional one-sentence tagline",
  "scopeAssessment": "Optional: the scope assessment paragraph from Stage 1",
  "seriesArc": "Optional: 2-3 sentence emotional/theological arc from Stage 4",
  "durationCheck": "Optional: duration assessment from Stage 5",
  "specialAttention": "Optional: weeks needing special attention from Stage 5",
  "launchRecommendation": "Optional: launch recommendation from Stage 5",
  "description": "Optional: brief overall description of the series",
  "weeks": [
    {
      "weekNumber": 1,
      "sermonTitle": "Week 1 Sermon Title",
      "scriptureRef": "Book Ch:Vs",
      "bigIdea": "One sentence core truth",
      "connectiveThread": "How this week connects to the next"
    }
  ]
}

CONVERSATION:
---
`

/**
 * Extracts structured series data from a SkillChat conversation.
 * Sends the conversation to the AI with the extraction prompt and parses the JSON response.
 */
export async function extractSeriesFromConversation(
  messages: Message[],
  role: AIRole = 'generator'
): Promise<ExtractedSeries | null> {
  const extractionMessages: Message[] = [
    { role: 'system', content: EXTRACTION_PROMPT },
    ...messages.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: 'Extract the series plan data from our conversation above. Return only the JSON object, no other text.' },
  ]

  try {
    console.log('[extractSeries] Sending extraction request, messages:', extractionMessages.length)

    const client = getConvexClient()
    const result = await client.action('ai/actions:chat' as any, {
      operation: 'save_extraction',
      modelRole: role,
      messages: extractionMessages,
      temperature: 0.1,
    })

    const content = result?.content ?? ''
    if (!content) {
      console.error('[extractSeries] No content returned from AI')
      return null
    }

    console.log('[extractSeries] AI response length:', content.length, 'first 200 chars:', content.slice(0, 200))

    // Strip markdown code fences if present
    let jsonStr = content.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(jsonStr)
    console.log('[extractSeries] Parsed JSON successfully, title:', parsed.title, 'weeks:', parsed.weeks?.length ?? 0)
    return parsed as ExtractedSeries
  } catch (err) {
    console.error('[extractSeries] Extraction failed:', err)
    return null
  }
}