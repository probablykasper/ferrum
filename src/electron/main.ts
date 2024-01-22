import { app, ipcMain, session, BrowserWindow, dialog, protocol } from 'electron'
import is from './is'
import addon from '../../ferrum-addon'

if (is.dev) app.setName('Ferrum Dev')

import { initMenuBar } from './menubar'
import { initMediaKeys } from './shortcuts'
import('./ipc')
import path from 'path'

async function errHandler(msg: string, error: Error) {
  app.whenReady().then(() => {
    dialog.showMessageBoxSync({
      type: 'error',
      message: msg,
      detail: error.stack,
      title: 'Error',
    })
    errHandler(msg, error)
  })
}
process.on('uncaughtException', (error) => {
  errHandler('Unhandled Error', error)
})
process.on('unhandledRejection', (error: Error) => {
  errHandler('Unhandled Promise Rejection', error)
})

const appData = app.getPath('appData')
if (is.dev) {
  const electronDataPath = path.join(appData, 'space.kasper.ferrum.dev', 'Electron Data')
  app.setPath('userData', electronDataPath)
} else {
  const electronDataPath = path.join(appData, 'space.kasper.ferrum', 'Electron Data')
  app.setPath('userData', electronDataPath)
}

let quitting = false
let appLoaded = false

app.on('window-all-closed', () => {
  app.quit()
})

app.whenReady().then(async () => {
  let mainWindow: BrowserWindow | null = new BrowserWindow({
    width: 1305,
    height: 1000,
    minWidth: 850,
    minHeight: 400,
    titleBarStyle: is.mac ? 'hidden' : 'default',
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      preload: path.resolve(__dirname, './preload.js'),
    },
    backgroundColor: '#0D1115',
    show: false,
  })

  if (!is.dev) {
    await initMediaKeys(mainWindow)
  }

  protocol.registerFileProtocol('track', (request, callback) => {
    const url = decodeURI(request.url)
    const path = url.substring(6)
    callback(path)
  })

  protocol.registerBufferProtocol('trackimg', (request, callback) => {
    const url = decodeURI(request.url)
    const track_id = url.substring(9)
    addon
      .read_cover_async_path(track_id, 0)
      .then((buffer) => {
        callback(Buffer.from(buffer))
      })
      .catch((error) => {
        callback({ error: 500 })
        console.log('Could not read cover', error)
      })
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["script-src 'self' 'unsafe-inline';"],
      },
    })
  })

  if (is.dev) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'missing')
  else mainWindow.loadFile(path.resolve(__dirname, '../web/index.html'))

  if (is.dev) mainWindow.webContents.openDevTools()

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      app.hide()
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  ipcMain.once('appLoaded', () => {
    appLoaded = true
  })

  // doesn't fire on Windows :(
  app.on('before-quit', () => {
    if (appLoaded) {
      mainWindow?.webContents.send('gonnaQuit')
      ipcMain.once('readyToQuit', () => {
        quitting = true
        mainWindow?.close()
      })
    } else {
      quitting = true
      mainWindow?.close()
    }
  })

  app.on('activate', () => {
    if (mainWindow !== null) {
      mainWindow.show()
    }
  })

  initMenuBar(app, mainWindow)
})
