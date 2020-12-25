const { app, session, Menu, BrowserWindow, protocol } = require('electron')
const path = require('path')
const vars = require('./variables')
const appData = app.getPath('appData')
const electronData = path.join(appData, app.name, 'Electron Data')
app.setPath('userData', electronData)
// const addon = require('../native/addon.node')

const dev = process.env.APP_ENV === 'dev'
const devPort = process.env.DEV_PORT
const isMac = process.platform === 'darwin'
let mainWindow
let quitting = false

function ready() {

  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURI(request.url.replace('file:///', ''))
    callback(pathname)
  })

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 1000,
    minWidth: 850,
    minHeight: 400,
    frame: false,
    webPreferences: {
      contextIsolation: false,
      webSecurity: false,
      nodeIntegration: true,
      enableRemoteModule: true,
      preload: path.resolve(__dirname, './preload.js'),
    },
    backgroundColor: vars['--bg-color'],
    show: false,
  })

  if (dev) mainWindow.webContents.openDevTools()

  // Here we set the CSP to allow 'unsafe-eval' for 'self' because Nollup
  // uses eval(). This causes a security warning, so we disable that. This
  // should be fine because 'self' won't be an external origin, as we only
  // index.html locally.
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true
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

  mainWindow.on('close', (e) => {
    if (isMac && !quitting) e.preventDefault()
    if (isMac && !quitting) mainWindow.hide()
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', ready)

app.on('before-quit', () => {
  quitting = true
})
app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) ready()
  else mainWindow.show()
})

const template = [
  ...isMac ? [ {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  } ] : [],
  {
    label: 'File',
    submenu: [
      {
        label: 'Import iTunes Library...',
        accelerator: 'CommandOrControl+I',
        click: () => {
          mainWindow.webContents.send('itunesImport')
        },
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...isMac ? [
        // { role: 'pasteAndMatchStyle' },
        // { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        // {
        //   label: 'Speech',
        //   submenu: [
        //     { role: 'startSpeaking' },
        //     { role: 'stopSpeaking' },
        //   ],
        // },
      ] : [
        // { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        // { role: 'window' },
      ] : [
        { role: 'close' },
      ],
    ],
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: async() => {
          const { shell } = require('electron')
          await shell.openExternal('https://github.com/probablykasper/ferrum')
        },
      },
    ],
  },
]
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
