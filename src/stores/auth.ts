import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  CONVEX_AUTH_TOKEN_KEY,
  getConvexClient,
  setConvexAuthChangeHandler,
  setConvexAuthToken,
} from '@/lib/convex'

export interface AuthUser {
  _id: string
  email: string
  name: string
  creditBalance: number
  hasProfile: boolean
  needsOnboarding: boolean
}

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'
const CONVEX_REQUEST_TIMEOUT = 20000 // 20 seconds
const CONVEX_AUTH_OAUTH_VERIFIER_KEY = '__convexAuthOAuthVerifier'

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${CONVEX_REQUEST_TIMEOUT / 1000}s`)), CONVEX_REQUEST_TIMEOUT)
    ),
  ])
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const isAuthenticated = ref(false)
  const isLoading = ref(false)
  const isCheckingAuth = ref(true)
  const error = ref<string | null>(null)

  const isReady = computed(() => !isCheckingAuth.value)
  let handlingAuthExpiry = false

  setConvexAuthChangeHandler((backendIsAuthenticated) => {
    if (DEV_BYPASS || backendIsAuthenticated || handlingAuthExpiry) return

    handlingAuthExpiry = true
    console.warn('[auth] Session expired, redirecting to login')
    setConvexAuthToken(null)
    user.value = null
    isAuthenticated.value = false

    void import('@/router')
      .then(({ router }) => {
        if (router.currentRoute.value.name !== 'login') {
          void router.push('/login')
        }
      })
      .finally(() => {
        handlingAuthExpiry = false
      })
  })

  function setDevUser(email?: string, name?: string) {
    user.value = {
      _id: 'dev-user',
      email: email ?? 'pastor@youpastor.app',
      name: name ?? 'Pastor Arnold',
      creditBalance: 100,
      hasProfile: true,
      needsOnboarding: false,
    }
    isAuthenticated.value = true
  }

  async function fetchUser(): Promise<void> {
    if (DEV_BYPASS) {
      if (!user.value) setDevUser()
      isCheckingAuth.value = false
      return
    }

    const storedToken = localStorage.getItem(CONVEX_AUTH_TOKEN_KEY)

    // If no stored token, skip the Convex call entirely — we're definitely not authenticated
    if (!storedToken) {
      console.log('[auth] No stored token, skipping Convex check')
      user.value = null
      isAuthenticated.value = false
      isCheckingAuth.value = false
      return
    }

    // Token exists — verify it with Convex
    console.log('[auth] Stored token found, verifying with Convex...')
    try {
      const client = getConvexClient()
      const data = await withTimeout(
        client.query('users/queries:getMe' as any, {}),
        'Auth check'
      )
      console.log('[auth] fetchUser got data:', data ? 'yes' : 'no')
      if (data) {
        user.value = data as AuthUser
        isAuthenticated.value = true
      } else {
        user.value = null
        isAuthenticated.value = false
        setConvexAuthToken(null)
      }
    } catch (err: any) {
      console.warn('[auth] fetchUser failed:', err?.message || String(err))
      user.value = null
      isAuthenticated.value = false
      setConvexAuthToken(null)
    } finally {
      isCheckingAuth.value = false
    }
  }

  async function signInWithPassword(email: string, password: string): Promise<boolean> {
    if (DEV_BYPASS) {
      setDevUser(email)
      return true
    }

    isLoading.value = true
    error.value = null

    try {
      const client = getConvexClient()
      console.log('[auth] Signing in...', { email })

      const result = await withTimeout(
        client.action('auth:signIn' as any, {
          provider: 'password',
          params: { email, password, flow: 'signIn' },
        }),
        'Sign in'
      )
      console.log('[auth] signIn result:', result)

      const token = result?.tokens?.token ?? null
      const refreshToken = result?.tokens?.refreshToken ?? null
      if (!token || !refreshToken) {
        throw new Error('No auth tokens returned from server')
      }

      setConvexAuthToken(token, refreshToken)
      await fetchUser()
      return isAuthenticated.value
    } catch (err: any) {
      console.error('[auth] signIn error:', err)
      error.value = parseAuthError(err)
      isAuthenticated.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function signInWithGoogle(): Promise<boolean> {
    if (DEV_BYPASS) {
      setDevUser()
      return true
    }

    isLoading.value = true
    error.value = null

    // In Electron, start a local callback server to avoid custom protocol issues.
    // The server captures Google's redirect and converts it to a deep-link event.
    const appLinks = (window as any).appLinks
    let redirectTo = 'youpastor://auth/callback'
    if (appLinks?.startCallbackServer) {
      try {
        const port: number = await appLinks.startCallbackServer()
        redirectTo = `http://127.0.0.1:${port}/callback`
      } catch (err) {
        console.warn('[auth] Could not start callback server, falling back to deep link', err)
      }
    }

    // Retry up to 3 times in case Convex drops the connection briefly
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const client = getConvexClient()
        const result: any = await withTimeout(
          client.action('auth:signIn' as any, {
            provider: 'google',
            params: { redirectTo },
          }),
          'Google sign in'
        )

        if (!result?.redirect || !result?.verifier) {
          throw new Error('Google sign-in URL was not returned.')
        }

        localStorage.setItem(CONVEX_AUTH_OAUTH_VERIFIER_KEY, result.verifier)
        await openExternalUrl(String(result.redirect))
        isLoading.value = false
        return true
      } catch (err: any) {
        const isConnectionError = err.message?.includes('Connection lost') || err.message?.includes('timed out')
        if (isConnectionError && attempt < 3) {
          console.warn(`[auth] Google signIn attempt ${attempt} failed (${err.message}), retrying...`)
          await new Promise(r => setTimeout(r, 1000 * attempt))
          continue
        }
        console.error('[auth] Google signIn error:', err)
        localStorage.removeItem(CONVEX_AUTH_OAUTH_VERIFIER_KEY)
        error.value = parseAuthError(err)
        isAuthenticated.value = false
        isLoading.value = false
        return false
      }
    }
    isLoading.value = false
    return false
  }

  async function completeGoogleSignIn(code: string): Promise<boolean> {
    if (DEV_BYPASS) {
      setDevUser()
      return true
    }

    isLoading.value = true
    error.value = null

    try {
      const verifier = localStorage.getItem(CONVEX_AUTH_OAUTH_VERIFIER_KEY)
      if (!verifier) {
        throw new Error('Google sign-in session expired. Please try again.')
      }

      const client = getConvexClient()
      const result: any = await withTimeout(
        client.action('auth:signIn' as any, {
          params: { code },
          verifier,
        }),
        'Google sign in callback'
      )

      const token = result?.tokens?.token ?? null
      const refreshToken = result?.tokens?.refreshToken ?? null
      if (!token || !refreshToken) {
        throw new Error('No auth tokens returned from server')
      }

      setConvexAuthToken(token, refreshToken)
      localStorage.removeItem(CONVEX_AUTH_OAUTH_VERIFIER_KEY)
      await fetchUser()
      return isAuthenticated.value
    } catch (err: any) {
      console.error('[auth] Google callback error:', err)
      error.value = parseAuthError(err)
      isAuthenticated.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function signUpWithPassword(
    email: string,
    password: string,
    name?: string
  ): Promise<boolean> {
    if (DEV_BYPASS) {
      setDevUser(email, name)
      return true
    }

    isLoading.value = true
    error.value = null

    try {
      const client = getConvexClient()
      console.log('[auth] Signing up...', { email })

      const result = await withTimeout(
        client.action('auth:signIn' as any, {
          provider: 'password',
          params: { email, password, flow: 'signUp' },
        }),
        'Sign up'
      )
      console.log('[auth] signUp result:', result)

      const token = result?.tokens?.token ?? null
      const refreshToken = result?.tokens?.refreshToken ?? null
      if (!token || !refreshToken) {
        throw new Error('No auth tokens returned from server')
      }

      setConvexAuthToken(token, refreshToken)
      console.log('[auth] Token stored, waiting for auth handshake...')
      await new Promise((r) => setTimeout(r, 500))

      // Retry profile creation — auth might not be ready immediately
      try {
        await retry(
          () =>
            withTimeout(
              client.mutation('profile/mutations:createMinimal' as any, {
                pastorName: name ?? '',
              }),
              'Profile creation'
            ),
          { maxAttempts: 5, delayMs: 300 }
        )
        console.log('[auth] Profile created')
      } catch (profileErr: any) {
        console.warn('[auth] Profile creation failed:', profileErr?.message)
      }

      await fetchUser()
      return isAuthenticated.value
    } catch (err: any) {
      console.error('[auth] signUp error:', err)
      error.value = parseAuthError(err)
      isAuthenticated.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function signOut(): Promise<void> {
    if (DEV_BYPASS) {
      user.value = null
      isAuthenticated.value = false
      return
    }

    try {
      const client = getConvexClient()
      await withTimeout(client.action('auth:signOut' as any, {}), 'Sign out')
    } catch (err: any) {
      console.warn('[auth] signOut error:', err?.message)
    } finally {
      setConvexAuthToken(null)
      user.value = null
      isAuthenticated.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  function markOnboardingComplete() {
    if (user.value) {
      user.value = { ...user.value, needsOnboarding: false }
    }
  }

  function setCreditBalance(balance: number) {
    if (user.value) {
      user.value = { ...user.value, creditBalance: Math.max(0, Math.floor(balance)) }
    }
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    isCheckingAuth,
    isReady,
    error,
    signInWithPassword,
    signInWithGoogle,
    completeGoogleSignIn,
    signUpWithPassword,
    signOut,
    fetchUser,
    clearError,
    markOnboardingComplete,
    setCreditBalance,
  }
})

async function openExternalUrl(url: string) {
  // Prefer Electron's shell.openExternal via IPC (opens system browser properly)
  const appLinks = (window as any).appLinks
  if (appLinks?.openExternal) {
    await appLinks.openExternal(url)
    return
  }

  // Web fallback: open in new tab
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (opened) {
    opened.opener = null
    return
  }

  // If we are in Electron without IPC, do NOT navigate the main window
  const isElectron = navigator.userAgent.toLowerCase().includes('electron')
  if (isElectron) return

  window.location.href = url
}

async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delayMs?: number; backoff?: number } = {}
): Promise<T> {
  const { maxAttempts = 5, delayMs = 300, backoff = 1.5 } = options
  let lastErr: any
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastErr = err
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(backoff, attempt - 1)))
      }
    }
  }
  throw lastErr
}

function parseAuthError(err: any): string {
  const message = err?.message ?? err?.data?.message ?? String(err)
  const raw = [
    message,
    err?.data?.message,
    err?.cause?.message,
    JSON.stringify(err?.data ?? ''),
  ]
    .filter(Boolean)
    .join(' | ')

  const normalized = raw
    .replace(/\[CONVEX[^\]]*\]/g, ' ')
    .replace(/\[Request ID:[^\]]+\]/g, ' ')
    .replace(/\bCalled by client\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (normalized.includes('Invalid password') || normalized.includes('Invalid credentials') || normalized.includes('InvalidSecret')) {
    return 'Incorrect password. Please try again.'
  }
  if (normalized.includes('User not found') || normalized.includes('No account found') || normalized.includes('InvalidAccountId')) {
    return 'No account found with this email. Try signing up instead.'
  }
  if (normalized.includes('already exists') || normalized.includes('already registered') || normalized.includes('Account already exists')) {
    return 'An account with this email already exists. Try signing in instead.'
  }
  if (normalized.includes('too short') || normalized.includes('at least')) {
    return 'Password must be at least 8 characters.'
  }
  if (normalized.includes('Invalid email')) {
    return 'Please enter a valid email address.'
  }
  if (normalized.includes('No auth token')) {
    return 'Authentication failed. Please try again.'
  }
  if (normalized.includes('timed out')) {
    return 'Connection timed out. Make sure `npx convex dev` is running.'
  }

  // Convex production can mask auth provider failures as generic server errors.
  if (normalized.includes('auth:signIn') && normalized.includes('Server Error')) {
    return 'No account found with this email. Try signing up instead.'
  }
  if (normalized === 'Server Error |' || normalized === 'Server Error' || normalized.startsWith('Server Error |')) {
    return 'Invalid email or password. Please try again.'
  }

  return normalized || 'Something went wrong. Please try again.'
}
