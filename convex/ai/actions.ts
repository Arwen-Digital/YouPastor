import { action } from "../_generated/server"
import { v } from "convex/values"
import {
  AI_OPERATION_CREDITS,
  estimateCostUsdMicrosFromTokens,
  type AIOperation,
} from "../credits/config"

const MODEL_ENV_BY_ROLE = {
  orchestrator: ["AI_MODEL_ORCHESTRATOR", "VITE_AI_MODEL_ORCHESTRATOR"],
  generator: ["AI_MODEL_GENERATOR", "VITE_AI_MODEL_GENERATOR"],
  researcher: ["AI_MODEL_RESEARCHER", "VITE_AI_MODEL_RESEARCHER"],
} as const

type ModelRole = keyof typeof MODEL_ENV_BY_ROLE

function resolveModelFromEnv(role: ModelRole): string {
  const envKeys = MODEL_ENV_BY_ROLE[role]
  for (const key of envKeys) {
    const value = (process.env[key] ?? "").trim()
    if (value) return value
  }
  throw new Error(`No model configured for role '${role}'. Set ${envKeys[0]} on Convex.`)
}

type OpenRouterResponse = {
  id?: string
  model?: string
  error?: any
  citations?: string[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
    cost?: number | string
    total_cost?: number | string
  }
  choices?: Array<{
    finish_reason?: string
    message?: {
      content?: string
      citations?: string[]
    }
  }>
  cost?: number | string
  total_cost?: number | string
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options)
    if (response.status === 429 && attempt < maxRetries) {
      await sleep(Math.pow(2, attempt) * 1500)
      continue
    }
    return response
  }
  throw new Error("Max retries exceeded")
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function providerCostUsdMicros(data: OpenRouterResponse): number {
  const direct =
    parseNumber(data.usage?.cost) ??
    parseNumber(data.usage?.total_cost) ??
    parseNumber(data.cost) ??
    parseNumber(data.total_cost)

  if (direct !== null) {
    return Math.max(0, Math.round(direct * 1_000_000))
  }

  return estimateCostUsdMicrosFromTokens({
    model: data.model ?? "",
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
  })
}

export const chat = action({
  args: {
    operation: v.string(),
    skillSlug: v.optional(v.string()),
    modelRole: v.union(v.literal("orchestrator"), v.literal("generator"), v.literal("researcher")),
    messages: v.array(
      v.object({
        role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
    temperature: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      if (!(args.operation in AI_OPERATION_CREDITS)) {
        throw new Error(`Unknown AI operation: ${args.operation}`)
      }

      const operation = args.operation as AIOperation
      const creditsToCharge = AI_OPERATION_CREDITS[operation]
      const resolvedModel = resolveModelFromEnv(args.modelRole as ModelRole)

      await ctx.runMutation("credits/internal:assertSufficientCredits" as any, {
        requiredCredits: creditsToCharge,
        operation,
      })

      const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_AI_API_KEY || process.env.VITE_OPENROUTER_API_KEY
      if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is not configured on the backend")
      }

      const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
      const response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://youpastor.app",
          "X-Title": "YouPastor",
        },
        body: JSON.stringify({
          model: resolvedModel,
          messages: args.messages,
          temperature: args.temperature ?? 0.7,
          max_tokens: args.maxTokens,
        }),
      })

      const bodyText = await response.text()
      if (!response.ok) {
        throw new Error(`OpenRouter error (${response.status}): ${bodyText.slice(0, 1000)}`)
      }

      let data: OpenRouterResponse
      try {
        data = JSON.parse(bodyText)
      } catch (err) {
        throw new Error(`OpenRouter JSON parse error: ${String(err)}`)
      }

      if (data.error) {
        throw new Error(`OpenRouter API error: ${JSON.stringify(data.error)}`)
      }

      const choice = data.choices?.[0]
      const content = choice?.message?.content ?? ""
      if (!content.trim()) {
        throw new Error(
          `AI returned empty content (finish_reason: ${choice?.finish_reason ?? "unknown"}).`
        )
      }

      const usageCostMicros = providerCostUsdMicros(data)
      const resolvedResponseModel = data.model ?? resolvedModel
      const usageResult = await ctx.runMutation("credits/internal:recordUsageSuccess" as any, {
        operation,
        skillSlug: args.skillSlug,
        modelRole: args.modelRole,
        model: resolvedResponseModel,
        providerRequestId: data.id,
        providerCostUsdMicros: usageCostMicros,
        creditsCharged: creditsToCharge,
      })

      return {
        content,
        citations: data.citations ?? choice?.message?.citations,
        model: resolvedResponseModel,
        creditsCharged: creditsToCharge,
        remainingCredits: usageResult?.remainingCredits,
        providerCostUsdMicros: usageCostMicros,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("AI chat failed:", message)
      return {
        content: "",
        error: message,
        citations: [],
        model: args.modelRole,
        creditsCharged: 0,
        providerCostUsdMicros: 0,
      }
    }
  },
})
