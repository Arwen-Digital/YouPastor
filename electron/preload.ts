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
  getUpdateState: (): Promise<{
    status: 'idle' | 'available' | 'error'
    progress: number
    error: string | null
  }> => ipcRenderer.invoke('app:getUpdateState'),
})
