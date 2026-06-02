import { app, BrowserWindow, session, shell, ipcMain, nativeImage } from 'electron'
import { autoUpdater } from 'electron-updater'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import http from 'node:http'
import { registerIpcHandlers } from './ipc'

// Starts a one-shot local HTTP server that captures the OAuth callback from the browser.
// Returns the port immediately so the caller can embed it in the redirectTo URI before calling Convex.
// When the browser hits the callback, it converts it to a youpastor:// deep link and emits it.
function startCallbackServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end('<html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Sign-in complete!</h2><p>You can close this tab and return to YouPastor.</p><script>window.close()</script></body></html>')
      server.close()

      const incoming = new URL(req.url ?? '/', 'http://127.0.0.1')

      if (win && !win.isDestroyed()) {
        const code = incoming.searchParams.get('code')
        const state = incoming.searchParams.get('state') ?? ''
        const route = `/auth/callback?code=${encodeURIComponent(code ?? '')}&state=${encodeURIComponent(state)}`
        navigateToRoute(route)
      }
    })

    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number }
      resolve(addr.port)
    })
  })
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

const appIconPath = path.join(process.env.VITE_PUBLIC, process.platform === 'darwin' ? 'icon-mac.png' : 'icon.png')
app.setName('YouPastor')

let win: BrowserWindow | null
let pendingDeepLink: string | null = null
let updateStatus: 'idle' | 'available' | 'downloading' | 'downloaded' | 'error' = 'idle'
let updateProgress = 0
let updateError: string | null = null

function emitUpdateState() {
  win?.webContents.send('app:update-state', {
    status: updateStatus,
    progress: updateProgress,
    error: updateError,
  })
}

function getDeepLinkRoute(url: string): string | null {
  try {
    const parsed = new URL(url)
    const routePath = parsed.hostname ? `/${parsed.hostname}${parsed.pathname}` : parsed.pathname

    if (routePath === '/billing/success') return '/billing/success'
    if (routePath === '/billing/cancel') return '/upgrade?checkout=cancel'
    return null
  } catch {
    return null
  }
}

function navigateToRoute(route: string) {
  if (!win || win.isDestroyed()) return

  if (VITE_DEV_SERVER_URL) {
    void win.loadURL(`${VITE_DEV_SERVER_URL}#${route}`)
  } else {
    void win.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: route })
  }
}

function emitDeepLink(url: string) {
  if (win && !win.isDestroyed()) {
    const route = getDeepLinkRoute(url)
    if (route) {
      navigateToRoute(route)
    } else {
      win.webContents.send('deep-link', url)
    }
  } else {
    pendingDeepLink = url
  }
}

function extractDeepLink(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith('youpastor://')) ?? null
}

function setupAutoUpdater() {
  if (!app.isPackaged) return

  // Do not download automatically. First show the user that an update is
  // available; clicking the sidebar notice starts the download on demand.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('update-available', () => {
    console.log('Update available.')
    updateStatus = 'available'
    updateProgress = 0
    updateError = null
    emitUpdateState()
  })

  autoUpdater.on('download-progress', (progress) => {
    updateStatus = 'downloading'
    updateProgress = Math.max(0, Math.min(100, progress.percent ?? 0))
    updateError = null
    emitUpdateState()
  })

  autoUpdater.on('update-downloaded', () => {
    updateStatus = 'downloaded'
    updateProgress = 100
    updateError = null
    emitUpdateState()
  })

  autoUpdater.on('update-not-available', () => {
    console.log('No update available.')
    updateStatus = 'idle'
    updateProgress = 0
    updateError = null
    emitUpdateState()
  })

  autoUpdater.on('error', (error) => {
    console.error('Auto-update error:', error)
    updateStatus = 'error'
    updateError = error?.message ?? String(error)
    emitUpdateState()
  })

  void autoUpdater.checkForUpdates()
}

function createWindow() {
  win = new BrowserWindow({
    icon: appIconPath,
    title: 'YouPastor',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const } : {}),
    width: 1382,
    height: 864,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
    emitUpdateState()
    if (pendingDeepLink) {
      const deepLink = pendingDeepLink
      pendingDeepLink = null
      setTimeout(() => {
        const route = getDeepLinkRoute(deepLink)
        if (route) {
          navigateToRoute(route)
        } else {
          win?.webContents.send('deep-link', deepLink)
        }
      }, 300)
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const deepLink = extractDeepLink(argv)
    if (deepLink) emitDeepLink(deepLink)

    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

app.on('open-url', (event, url) => {
  event.preventDefault()
  emitDeepLink(url)
})

app.whenReady().then(() => {
  app.setName('YouPastor')
  if (process.platform === 'darwin') {
    app.dock?.setIcon(nativeImage.createFromPath(appIconPath))
  }
  app.setAsDefaultProtocolClient('youpastor')
  const deepLink = extractDeepLink(process.argv)
  if (deepLink) pendingDeepLink = deepLink
  
  // IPC: start local callback server, return the port so renderer can pass it as redirectTo to Convex
  ipcMain.handle('auth:startCallbackServer', async () => {
    return startCallbackServer()
  })

  ipcMain.handle('app:getUpdateState', async () => {
    return {
      status: updateStatus,
      progress: updateProgress,
      error: updateError,
    }
  })

  ipcMain.handle('app:downloadUpdate', async () => {
    if (updateStatus !== 'available') return { ok: false }
    updateStatus = 'downloading'
    updateProgress = 0
    updateError = null
    emitUpdateState()
    await autoUpdater.downloadUpdate()
    return { ok: true }
  })

  ipcMain.handle('app:installUpdate', async () => {
    if (updateStatus !== 'downloaded') return { ok: false }

    // On Windows, NSIS can fail with "YouPastor cannot be closed" if the
    // installer starts before Chromium has fully released the app process.
    // Hide/destroy the window first, then let electron-updater quit and install.
    if (process.platform === 'win32' && win && !win.isDestroyed()) {
      win.hide()
      win.destroy()
      win = null
      setTimeout(() => autoUpdater.quitAndInstall(false, true), 500)
    } else {
      autoUpdater.quitAndInstall(false, true)
    }

    return { ok: true }
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' http://localhost:*; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convexsite.cloud https://openrouter.ai https://*.openrouter.ai ws://localhost:* wss://localhost:* http://localhost:* ws://127.0.0.1:* wss://127.0.0.1:* http://127.0.0.1:*; font-src 'self' data:",
        ],
      },
    })
  })

  registerIpcHandlers()
  createWindow()
  setupAutoUpdater()
})

app.on('before-quit', () => {
  win = null
})
