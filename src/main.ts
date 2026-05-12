import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import App from './App.vue'
import './assets/main.css'

async function bootstrap() {
  const app = createApp(App)
  app.use(createPinia())

  // Resolve auth BEFORE the router starts navigating.
  // This prevents the router guard from async-hanging on initial load.
  const { useAuthStore } = await import('@/stores/auth')
  const auth = useAuthStore()

  // If there's a stored token, restore auth state before routing
  const storedToken = localStorage.getItem('__convexAuthJWT')
  if (storedToken) {
    const { setConvexAuthToken } = await import('@/lib/convex')
    setConvexAuthToken(storedToken)
  }

  await auth.fetchUser()

  app.use(router)
  app.mount('#app')

  app.$nextTick(() => {
    window.ipcRenderer?.on('main-process-message', (_event: any, message: any) => {
      console.log(message)
    })
  })
}

bootstrap()
