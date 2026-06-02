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
    getUpdateState: () => Promise<{
      status: 'idle' | 'available' | 'downloading' | 'downloaded' | 'error'
      progress: number
      error: string | null
    }>
    installUpdate: () => Promise<{ ok: boolean }>
  }
}
