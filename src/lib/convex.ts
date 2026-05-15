import { ConvexClient, ConvexHttpClient } from 'convex/browser'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string

export const CONVEX_AUTH_TOKEN_KEY = '__convexAuthJWT'
export const CONVEX_AUTH_REFRESH_TOKEN_KEY = '__convexAuthRefreshToken'

type AuthTokens = {
  token: string
  refreshToken: string
}

let client: ConvexClient | null = null
let refreshPromise: Promise<string | null> | null = null
let authChangeHandler: ((isAuthenticated: boolean) => void) | null = null

export function getConvexClient(): ConvexClient {
  if (!client) {
    if (!convexUrl) {
      throw new Error('VITE_CONVEX_URL is not set. Run `npx convex dev` to configure.')
    }
    client = new ConvexClient(convexUrl)
    configureClientAuth(client)
  }
  return client
}

export function setConvexAuthChangeHandler(handler: ((isAuthenticated: boolean) => void) | null) {
  authChangeHandler = handler
}

function configureClientAuth(c: ConvexClient) {
  const storedToken = localStorage.getItem(CONVEX_AUTH_TOKEN_KEY)
  const storedRefreshToken = localStorage.getItem(CONVEX_AUTH_REFRESH_TOKEN_KEY)

  if (!storedToken && !storedRefreshToken) return

  c.setAuth(fetchAuthToken, (isAuthenticated) => {
    console.log('[ConvexClient] Auth state changed:', isAuthenticated)
    authChangeHandler?.(isAuthenticated)
  })
}

async function fetchAuthToken({ forceRefreshToken }: { forceRefreshToken: boolean }): Promise<string | null> {
  if (!forceRefreshToken) {
    return localStorage.getItem(CONVEX_AUTH_TOKEN_KEY)
  }

  return await refreshAuthToken()
}

async function refreshAuthToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(CONVEX_AUTH_REFRESH_TOKEN_KEY)
  if (!refreshToken) return null

  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const httpClient = new ConvexHttpClient(convexUrl)
      const result: any = await httpClient.action('auth:signIn' as any, { refreshToken })
      const tokens = result?.tokens

      if (!tokens?.token || !tokens?.refreshToken) {
        clearStoredAuthTokens()
        return null
      }

      storeAuthTokens(tokens)
      return tokens.token
    } catch (err: any) {
      console.warn('[ConvexClient] Failed to refresh auth token:', err?.message || String(err))
      clearStoredAuthTokens()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function storeAuthTokens(tokens: AuthTokens) {
  localStorage.setItem(CONVEX_AUTH_TOKEN_KEY, tokens.token)
  localStorage.setItem(CONVEX_AUTH_REFRESH_TOKEN_KEY, tokens.refreshToken)
}

function clearStoredAuthTokens() {
  localStorage.removeItem(CONVEX_AUTH_TOKEN_KEY)
  localStorage.removeItem(CONVEX_AUTH_REFRESH_TOKEN_KEY)
}

/**
 * Set the auth tokens on the Convex client after sign in/up.
 * Stores both the short-lived JWT and refresh token for persistence across reloads.
 */
export function setConvexAuthToken(token: string | null, refreshToken?: string | null) {
  const c = getConvexClient()

  if (token && refreshToken) {
    storeAuthTokens({ token, refreshToken })
    c.setAuth(fetchAuthToken, (isAuthenticated) => {
      console.log('[ConvexClient] Auth state changed:', isAuthenticated)
      authChangeHandler?.(isAuthenticated)
    })
  } else {
    clearStoredAuthTokens()
    c.setAuth(async () => null, (isAuthenticated) => {
      console.log('[ConvexClient] Auth state changed:', isAuthenticated)
      authChangeHandler?.(isAuthenticated)
    })
  }
}
