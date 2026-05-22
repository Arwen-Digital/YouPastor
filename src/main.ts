import { createApp, nextTick } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import App from './App.vue'
import './assets/main.css'

function getDeepLinkPath(url: string): string {
  const parsed = new URL(url)
  if (parsed.protocol === 'youpastor:' && parsed.hostname) {
    return `/${parsed.hostname}${parsed.pathname}`
  }
  return parsed.pathname
}

async function bootstrap() {
  const app = createApp(App)
  app.use(createPinia())

  // Resolve auth BEFORE the router starts navigating.
  // This prevents the router guard from async-hanging on initial load.
  const { useAuthStore } = await import('@/stores/auth')
  const auth = useAuthStore()

  await auth.fetchUser()

  app.use(router)
  app.mount('#app')

  nextTick(() => {
    window.ipcRenderer?.on('main-process-message', (_event: any, message: any) => {
      console.log(message)
    })

    const handleDeepLink = async (_event: any, url: string) => {
      try {
        const path = getDeepLinkPath(url)
        
        if (path === '/billing/success') {
          await router.push({ path: '/billing/success' })
        } else if (path === '/billing/cancel') {
          await router.push({ path: '/upgrade', query: { checkout: 'cancel' } })
        } else if (path === '/auth/callback') {
          const code = new URL(url).searchParams.get('code')
          if (!code) throw new Error('Missing Google sign-in code')
          
          const success = await auth.completeGoogleSignIn(code)
          if (success) {
            await router.push(auth.user?.needsOnboarding ? '/onboarding' : '/')
          } else {
            await router.push('/login')
          }
        }
      } catch (err: any) {
        console.warn('[deep-link] Failed to parse URL', err)
      }
    }

    // Listen via IPC (preload bridge)
    window.ipcRenderer?.on('deep-link', handleDeepLink)

    // Listen via custom DOM event (executeJavaScript fallback — works even without preload)
    window.addEventListener('youpastor-deep-link', (e: Event) => {
      handleDeepLink(null, (e as CustomEvent).detail)
    })
  })
}

bootstrap()
