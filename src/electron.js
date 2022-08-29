/* eslint-disable @typescript-eslint/no-var-requires */
const { app, ipcMain, session, BrowserWindow, dialog, protocol } = require('electron')
const is = require('./electron/is.js')
if (is.dev) app.setName('Ferrum Dev')

const menubar = require('./electron/menubar.js')
const shortcuts = require('./electron/shortcuts.js')
require('./electron/ipc.js')
const path = require('path')

async function errHandler(msg, error) {
  if (app.isReady()) {
    dialog.showMessageBoxSync({
      type: 'error',
      message: msg,
      detail: error.stack,
      title: 'Error',
    })
  } else {
    app.on('msg, error', () => {
      errHandler(msg, error)
    })
  }
}
process.on('uncaughtException', (error) => {
  errHandler('Unhandled Error', error)
})
process.on('unhandledRejection', (error) => {
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

app.on('window-all-closed', () => {
  app.quit()
})

app.on('ready', async () => {
  let mainWindow = new BrowserWindow({
    width: 1300,
    height: 1000,
    minWidth: 850,
    minHeight: 400,
    titleBarStyle: is.mac ? 'hidden' : 'default',
    webPreferences: {
      nativeWindowOpen: true,
      contextIsolation: false,
      nodeIntegration: true,
      preload: path.resolve(__dirname, './electron/preload.js'),
    },
    backgroundColor: '#0D1115',
    show: false,
  })

  if (!is.dev) {
    await shortcuts.initMediaKeys(mainWindow)
  }

  protocol.registerFileProtocol('track', (request, callback) => {
    const url = decodeURI(request.url)
    const path = url.substring(7)
    callback(path)
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["script-src 'self' 'unsafe-inline';"],
      },
    })
  })

  if (is.dev) mainWindow.loadURL('http://localhost:' + (process.env.PORT || 8089))
  else mainWindow.loadFile(path.resolve(__dirname, '../build/web/index.html'))

  if (is.dev) mainWindow.webContents.openDevTools()

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // doesn't fire on Windows :(
  app.on('before-quit', () => {
    mainWindow.webContents.send('gonnaQuit')
    ipcMain.once('readyToQuit', () => {
      quitting = true
      mainWindow.close()
    })
  })

  app.on('activate', () => {
    if (mainWindow !== null) {
      mainWindow.show()
    }
  })

  menubar.initMenuBar(app, mainWindow)
})
