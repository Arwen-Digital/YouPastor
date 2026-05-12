/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}

interface Window {
  ipcRenderer: import('electron').IpcRenderer
  secretStore: {
    set(key: string, value: string): Promise<boolean>
    get(key: string): Promise<string | null>
    delete(key: string): Promise<boolean>
  }
}
