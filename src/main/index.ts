import { app, shell, ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { DatabaseService } from './database/DatabaseService'
import { registerIpcHandlers } from './ipc/handlers'
import { getResolvedMongoUri } from './config/AppConfig'
import { warn, logError } from './lib/logger'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Lupa - Gerenciador de OS',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (app.isPackaged) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://wa.me"
          ]
        }
      })
    })
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  if (!app.isPackaged) {
    require('dotenv/config')
  }

  electronApp.setAppUserModelId('com.lupa')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const db = DatabaseService.getInstance()

  db.onStateChange((state, info) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('db:state-change', state, info)
    })
  })

  registerIpcHandlers(db)

  ipcMain.handle('open-external', async (_, url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error(`Blocked protocol: ${parsed.protocol}`)
      }
      await shell.openExternal(url)
    } catch (err) {
      logError('[open-external] Failed:', err)
      throw err
    }
  })

  createWindow()

  try {
    await db.initialize(getResolvedMongoUri())
  } catch {
    warn('[App] DB unavailable, starting in offline mode')
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

let isQuitting = false

app.on('before-quit', async (e) => {
  if (isQuitting) return
  const db = DatabaseService.getInstance()
  if (db.isConnected()) {
    e.preventDefault()
    isQuitting = true
    try {
      await db.disconnect()
    } catch {
      // ignore
    }
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
