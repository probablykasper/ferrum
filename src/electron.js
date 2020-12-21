const { app, session, globalShortcut, ipcMain, BrowserWindow, Electron, Menu } = require('electron')
const path = require('path')

let mainWindow
const dev = process.env.APP_ENV === 'dev'
const devPort = process.env.DEV_PORT

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 800,
    // minHeight
    // minWidth
    // darkTheme: true,
    frame: false,
    // vibrancy: dark,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
    },
    show: false,
  })

  // Here we set the CSP to allow 'unsafe-eval' for 'self' because Nollup
  // uses eval(). This causes a security warning, so we disable that. This
  // should be fine because 'self' won't be an external origin, as we only
  // index.html locally.
  mainWindow.ELECTRON_DISABLE_SECURITY_WARNINGS = true
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["script-src 'self' 'unsafe-inline' 'unsafe-eval';"],
      },
    })
  })

  if (dev) mainWindow.loadURL('http://localhost:'+devPort)
  else mainWindow.loadFile(path.resolve(__dirname, '../public/index.html'))

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  app.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
