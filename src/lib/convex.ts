import { ConvexClient } from 'convex/browser'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string

let client: ConvexClient | null = null

export function getConvexClient(): ConvexClient {
  if (!client) {
    if (!convexUrl) {
      throw new Error('VITE_CONVEX_URL is not set. Run `npx convex dev` to configure.')
    }
    client = new ConvexClient(convexUrl)

    // Restore stored auth token on client creation
    const storedToken = localStorage.getItem('__convexAuthJWT')
    if (storedToken) {
      client.setAuth(
        async () => storedToken,
        (isAuthenticated) => {
          console.log('[ConvexClient] Auth state:', isAuthenticated)
        }
      )
    }
  }
  return client
}

/**
 * Set the auth token on the Convex client after sign in/up.
 * Stores token in localStorage for persistence across reloads.
 */
export function setConvexAuthToken(token: string | null) {
  const c = getConvexClient()

  if (token) {
    localStorage.setItem('__convexAuthJWT', token)
    c.setAuth(
      async () => token,
      (isAuthenticated) => {
        console.log('[ConvexClient] Auth state changed:', isAuthenticated)
      }
    )
  } else {
    localStorage.removeItem('__convexAuthJWT')
    // Clear auth by setting a null-returning fetcher
    c.setAuth(async () => null)
  }
}
