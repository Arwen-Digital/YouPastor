import { ipcMain, safeStorage, shell } from 'electron'

const secrets = new Map<string, string>()

export function registerIpcHandlers() {
  ipcMain.handle('secrets:set', (_event, key: string, value: string) => {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(value)
        secrets.set(key, encrypted.toString('base64'))
      } else {
        secrets.set(key, value)
      }
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('secrets:get', (_event, key: string) => {
    const stored = secrets.get(key)
    if (!stored) return null
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(stored, 'base64')
        return safeStorage.decryptString(buffer)
      }
      return stored
    } catch {
      return null
    }
  })

  ipcMain.handle('secrets:delete', (_event, key: string) => {
    return secrets.delete(key)
  })

  ipcMain.handle('external:open', async (_event, url: string) => {
    if (!url || typeof url !== 'string') return false
    try {
      await shell.openExternal(url)
      return true
    } catch {
      return false
    }
  })
}
