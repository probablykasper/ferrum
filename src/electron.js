const { app, ipcMain, session, BrowserWindow, protocol } = require('electron')
const is = require('./electron/is.js')
const fs = require('fs').promises
if (is.dev) app.setName('Ferrum Dev')

const menubar = require('./electron/menubar.js')
const shortcuts = require('./electron/shortcuts.js')
const ipc = require('./electron/ipc.js')
const path = require('path')
const vars = require('./variables.json')

const appData = app.getPath('appData')
const electronDataPath = path.join(appData, app.name, 'Electron Data')
app.setPath('userData', electronDataPath)

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
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      contextIsolation: false,
      // Allow file:// during development, since the app is loaded via http
      webSecurity: !is.dev,
      nodeIntegration: true,
      preload: path.resolve(__dirname, './electron/preload.js'),
    },
    backgroundColor: vars['--bg-color'],
    show: false,
  })

  protocol.registerFileProtocol('file', (request, callback) => {
    const url = decodeURI(request.url)
    const path = url.substr(7)
    callback(path)
  })

  if (!is.dev) {
    const openSysPref = await shortcuts.initMediaKeys(mainWindow)
    if (openSysPref) return app.quit()
  }

  // Electron shows a warning when unsafe-eval is enabled, so we disable
  // security warnings. Somehow devtools doesn't open without unsafe-eval.
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["script-src 'self' 'unsafe-inline' 'unsafe-eval';"],
      },
    })
  })

  if (is.dev) mainWindow.loadURL('http://localhost:' + vars.port)
  else mainWindow.loadFile(path.resolve(__dirname, '../build/index.html'))

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

  app.on('before-quit', () => {
    mainWindow.webContents.send('gonnaQuit')
    ipcMain.once('readyToQuit', () => {
      quitting = true
      mainWindow.close()
    })
  })

  app.on('activate', () => {
    if (mainWindow === null) ready()
    else mainWindow.show()
  })

  menubar.initMenuBar(app, mainWindow)
})
