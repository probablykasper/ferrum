const { app, globalShortcut, ipcMain, BrowserWindow, Electron, Menu } = require('electron')
const path = require('path')

let mainWindow
const dev = process.env.APP_ENV === 'dev'
const devPort = process.env.DEV_PORT
console.log('::::procenv', process.env)

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
    // webPreferences: {
    //   nodeIntegration: true,
    // },
    show: false,
  })
  if (dev) {
    mainWindow.loadURL('http://localhost:'+devPort)
  } else {
    mainWindow.loadFile(path.resolve(__dirname, '../public/index.html'))
  }
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
