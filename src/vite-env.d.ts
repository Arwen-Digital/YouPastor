/// <reference types="vite/client" />

declare const __APP_VERSION__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*?raw' {
  const content: string
  export default content
}

interface Window {
  appLinks?: {
    openExternal: (url: string) => Promise<boolean>
    startCallbackServer: () => Promise<number>
    installUpdate: () => Promise<{ ok: boolean; reason?: string }>
    getUpdateState: () => Promise<{
      status: 'idle' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'error'
      progress: number
      ready: boolean
      error: string | null
    }>
  }
}
