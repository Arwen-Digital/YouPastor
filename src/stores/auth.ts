import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getConvexClient, setConvexAuthToken } from '@/lib/convex'

export interface AuthUser {
  _id: string
  email: string
  name: string
  creditBalance: number
  hasProfile: boolean
}

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'
const CONVEX_REQUEST_TIMEOUT = 8000 // 8 seconds

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

  function setDevUser(email?: string, name?: string) {
    user.value = {
      _id: 'dev-user',
      email: email ?? 'pastor@youpastor.app',
      name: name ?? 'Pastor Arnold',
      creditBalance: 100,
      hasProfile: true,
    }
    isAuthenticated.value = true
  }

  async function fetchUser(): Promise<void> {
    if (DEV_BYPASS) {
      if (!user.value) setDevUser()
      isCheckingAuth.value = false
      return
    }

    const storedToken = localStorage.getItem('__convexAuthJWT')

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
      if (!token) {
        throw new Error('No auth token returned from server')
      }

      setConvexAuthToken(token)
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
      if (!token) {
        throw new Error('No auth token returned from server')
      }

      setConvexAuthToken(token)
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

  return {
    user,
    isAuthenticated,
    isLoading,
    isCheckingAuth,
    isReady,
    error,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    fetchUser,
    clearError,
  }
})

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

  if (message.includes('Invalid password') || message.includes('Invalid credentials') || message.includes('InvalidSecret')) {
    return 'Incorrect password. Please try again.'
  }
  if (message.includes('User not found') || message.includes('No account found') || message.includes('InvalidAccountId')) {
    return 'No account found with this email. Try signing up instead.'
  }
  if (message.includes('already exists') || message.includes('already registered') || message.includes('Account already exists')) {
    return 'An account with this email already exists. Try signing in instead.'
  }
  if (message.includes('too short') || message.includes('at least')) {
    return 'Password must be at least 8 characters.'
  }
  if (message.includes('Invalid email')) {
    return 'Please enter a valid email address.'
  }
  if (message.includes('No auth token')) {
    return 'Authentication failed. Please try again.'
  }
  // Show generic error with the actual message for debugging
  if (message.includes('timed out')) {
    return 'Connection timed out. Make sure `npx convex dev` is running.'
  }

  return message || 'Something went wrong. Please try again.'
}
