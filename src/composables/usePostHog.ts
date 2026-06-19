import posthog from 'posthog-js'

let initialized = false
let warnedMissingToken = false

export function usePostHog() {
  if (!initialized) {
    const token = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN

    if (token) {
      posthog.init(token, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
        defaults: '2026-01-30',
      })
      initialized = true
    } else if (!warnedMissingToken) {
      console.warn('[posthog] VITE_POSTHOG_PROJECT_TOKEN is not configured')
      warnedMissingToken = true
    }
  }

  return { posthog }
}
