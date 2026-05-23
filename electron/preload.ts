import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

contextBridge.exposeInMainWorld('secretStore', {
  set: (key: string, value: string) =>
    ipcRenderer.invoke('secrets:set', key, value),
  get: (key: string) =>
    ipcRenderer.invoke('secrets:get', key),
  delete: (key: string) =>
    ipcRenderer.invoke('secrets:delete', key),
})

contextBridge.exposeInMainWorld('appLinks', {
  openExternal: (url: string) => ipcRenderer.invoke('external:open', url),
  startCallbackServer: (): Promise<number> => ipcRenderer.invoke('auth:startCallbackServer'),
  installUpdate: (): Promise<{ ok: boolean; reason?: string }> => ipcRenderer.invoke('app:installUpdate'),
  getUpdateState: (): Promise<{
    status: 'idle' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'error'
    progress: number
    ready: boolean
    error: string | null
  }> => ipcRenderer.invoke('app:getUpdateState'),
})
