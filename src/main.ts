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

    window.ipcRenderer?.on('deep-link', async (_event: any, url: string) => {
      try {
        const path = getDeepLinkPath(url)
        if (path === '/billing/success') {
          await router.push({ path: '/billing/success' })
        } else if (path === '/billing/cancel') {
          await router.push({ path: '/upgrade', query: { checkout: 'cancel' } })
        }
      } catch (err) {
        console.warn('[deep-link] Failed to parse URL', err)
      }
    })
  })
}

bootstrap()
