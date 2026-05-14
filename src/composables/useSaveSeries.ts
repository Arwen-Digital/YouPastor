import { ref, type Ref } from 'vue'
import { getConvexClient } from '@/lib/convex'
import { extractSeriesFromConversation } from '@/lib/extractSeries'
import type { Message } from '@/lib/ai/types'
import type { AIRole } from '@/lib/ai/types'

export type SaveStatus = 'idle' | 'extracting' | 'preview' | 'saving' | 'saved' | 'error'

export interface WeekPreview {
  weekNumber: number
  sermonTitle: string
  scriptureRef: string
  bigIdea: string
  connectiveThread: string
}

export interface SeriesPreview {
  title: string
  tagline: string
  scopeAssessment: string
  seriesArc: string
  durationCheck: string
  specialAttention: string
  launchRecommendation: string
  description: string
  weeks: WeekPreview[]
}

export function useSaveSeries() {
  const status: Ref<SaveStatus> = ref('idle')
  const preview: Ref<SeriesPreview | null> = ref(null)
  const error: Ref<string | null> = ref(null)
  const savedSeriesId: Ref<string | null> = ref(null)

  /**
   * Extract structured series data from conversation messages.
   * Sets status to 'preview' on success.
   */
  async function extract(messages: Message[], role: AIRole = 'generator') {
    status.value = 'extracting'
    error.value = null
    preview.value = null

    try {
      const data = await extractSeriesFromConversation(messages, role)
      if (!data) {
        throw new Error('Could not extract series data from the conversation. Make sure the conversation includes enough detail about a series plan.')
      }

      preview.value = {
        title: data.title ?? '',
        tagline: data.tagline ?? '',
        scopeAssessment: data.scopeAssessment ?? '',
        seriesArc: data.seriesArc ?? '',
        durationCheck: data.durationCheck ?? '',
        specialAttention: data.specialAttention ?? '',
        launchRecommendation: data.launchRecommendation ?? '',
        description: data.description ?? '',
        weeks: (data.weeks ?? []).map(w => ({
          weekNumber: w.weekNumber,
          sermonTitle: w.sermonTitle ?? '',
          scriptureRef: w.scriptureRef ?? '',
          bigIdea: w.bigIdea ?? '',
          connectiveThread: w.connectiveThread ?? '',
        })),
      }
      status.value = 'preview'
    } catch (err: any) {
      console.error('[useSaveSeries] extract failed:', err)
      error.value = err?.message ?? 'Extraction failed'
      status.value = 'error'
    }
  }

  /**
   * Confirm and save the preview data to Convex.
   * Uses the current preview (editable by the user).
   */
  async function save(data: SeriesPreview) {
    status.value = 'saving'
    error.value = null

    try {
      const client = getConvexClient()
      console.log('[useSaveSeries] Saving series to Convex...', { title: data.title, weeksCount: data.weeks.length })
      const seriesId = await client.mutation('series/mutations:create' as any, {
        title: data.title,
        tagline: data.tagline || undefined,
        scopeAssessment: data.scopeAssessment || undefined,
        seriesArc: data.seriesArc || undefined,
        durationCheck: data.durationCheck || undefined,
        specialAttention: data.specialAttention || undefined,
        launchRecommendation: data.launchRecommendation || undefined,
        description: data.description || undefined,
        status: 'draft',
        weeks: data.weeks.length > 0 ? data.weeks.map(w => ({
          weekNumber: w.weekNumber,
          sermonTitle: w.sermonTitle || undefined,
          scriptureRef: w.scriptureRef || undefined,
          bigIdea: w.bigIdea || undefined,
          connectiveThread: w.connectiveThread || undefined,
        })) : undefined,
      })

      console.log('[useSaveSeries] Series saved successfully, id:', seriesId)
      savedSeriesId.value = seriesId as string
      status.value = 'saved'
    } catch (err: any) {
      console.error('[useSaveSeries] save failed:', err)
      error.value = err?.message ?? 'Save failed'
      status.value = 'error'
    }
  }

  function reset() {
    status.value = 'idle'
    preview.value = null
    error.value = null
    savedSeriesId.value = null
  }

  return {
    status,
    preview,
    error,
    savedSeriesId,
    extract,
    save,
    reset,
  }
}