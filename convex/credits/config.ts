export const FREE_SIGNUP_CREDITS = 50

export const AI_OPERATION_CREDITS = {
  orchestrator_intake: 1,
  sermon_research: 20,
  sermon_brainstorm: 12,
  series_plan: 15,
  sermon_to_blog: 10,
  sermon_to_youtube: 8,
  sermon_companion: 6,
  small_group_questions: 8,
  church_social_post: 5,
  social_media_calendar: 10,
  church_email: 5,
  announcement_script: 5,
  church_letter: 6,
  meeting_agenda: 5,
  midweek_devotional: 6,
  save_extraction: 0,
} as const

export type AIOperation = keyof typeof AI_OPERATION_CREDITS

// USD per 1M tokens for fallback cost estimation when provider cost is not returned.
// Keep this table updated with your OpenRouter model routing choices.
export const MODEL_PRICING_PER_MILLION_USD: Record<string, { input: number; output: number }> = {
  "openai/gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "openai/gpt-4.1": { input: 2.0, output: 8.0 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-4o": { input: 5.0, output: 15.0 },
  "anthropic/claude-3.5-haiku": { input: 0.8, output: 4.0 },
  "anthropic/claude-3.5-sonnet": { input: 3.0, output: 15.0 },
  "google/gemini-2.0-flash-001": { input: 0.1, output: 0.4 },
}

export function getCreditsForOperation(operation: AIOperation): number {
  return AI_OPERATION_CREDITS[operation] ?? 0
}

export function normalizeModelForPricing(model: string): string {
  return model.trim().toLowerCase()
}

export function estimateCostUsdMicrosFromTokens(args: {
  model: string
  promptTokens?: number
  completionTokens?: number
}): number {
  const normalized = normalizeModelForPricing(args.model)
  const pricing = MODEL_PRICING_PER_MILLION_USD[normalized]
  if (!pricing) return 0

  const promptTokens = args.promptTokens ?? 0
  const completionTokens = args.completionTokens ?? 0

  const inputCostUsd = (promptTokens / 1_000_000) * pricing.input
  const outputCostUsd = (completionTokens / 1_000_000) * pricing.output
  const totalUsd = inputCostUsd + outputCostUsd

  return Math.max(0, Math.round(totalUsd * 1_000_000))
}
