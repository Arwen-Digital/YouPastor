import { app, BrowserWindow, session, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { registerIpcHandlers } from './ipc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null
let pendingDeepLink: string | null = null

function emitDeepLink(url: string) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('deep-link', url)
  } else {
    pendingDeepLink = url
  }
}

function extractDeepLink(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith('youpastor://')) ?? null
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    title: 'YouPastor',
    width: 1280,
    height: 800,
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
    if (pendingDeepLink) {
      win?.webContents.send('deep-link', pendingDeepLink)
      pendingDeepLink = null
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
  app.setAsDefaultProtocolClient('youpastor')
  const deepLink = extractDeepLink(process.argv)
  if (deepLink) pendingDeepLink = deepLink
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' http://localhost:*; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convexsite.cloud https://openrouter.ai https://*.openrouter.ai ws://localhost:* wss://localhost:* http://localhost:*; font-src 'self' data:",
        ],
      },
    })
  })

  registerIpcHandlers()
  createWindow()
})

app.on('before-quit', () => {
  win = null
})
