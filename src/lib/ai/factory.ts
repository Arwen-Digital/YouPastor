import type { AIProvider, ProviderConfig, ProviderType, AIRole } from './types'
import { OpenRouterProvider } from './openrouter'
import { OllamaProvider } from './ollama'
import { MockProvider } from './mock'

export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.type) {
    case 'openrouter':
      if (!config.apiKey) {
        throw new Error('OpenRouter requires an API key (VITE_AI_API_KEY)')
      }
      return new OpenRouterProvider(
        config.model,
        config.apiKey,
        config.baseUrl
      )

    case 'ollama':
      return new OllamaProvider(config.model, config.baseUrl)

    case 'mock':
      return new MockProvider(config.model)

    default:
      throw new Error(`Unknown provider type: ${config.type}`)
  }
}

const ROLE_ENV_MAP: Record<AIRole, string> = {
  orchestrator: 'VITE_AI_MODEL_ORCHESTRATOR',
  generator: 'VITE_AI_MODEL_GENERATOR',
  researcher: 'VITE_AI_MODEL_RESEARCHER',
}

const providers = new Map<string, AIProvider>()

/**
 * Get an AI provider for a specific role. Providers are cached per role+model.
 */
export function getProviderForRole(role: AIRole): AIProvider {
  const provider = (import.meta.env.VITE_AI_PROVIDER as ProviderType) ?? 'mock'
  const apiKey = (import.meta.env.VITE_AI_API_KEY as string) ?? ''
  const baseUrl = (import.meta.env.VITE_AI_BASE_URL as string) ?? undefined
  const model = (import.meta.env[ROLE_ENV_MAP[role]] as string) ?? 'mock'

  console.log('[AI Factory] Role:', role, '→ provider:', provider, 'model:', model, 'hasKey:', !!apiKey)

  const cacheKey = `${provider}:${role}:${model}`
  const cached = providers.get(cacheKey)
  if (cached) return cached

  const instance = createProvider({ type: provider, model, apiKey, baseUrl })
  providers.set(cacheKey, instance)
  return instance
}
