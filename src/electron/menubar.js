const { Menu, shell } = require('electron')
const is = require('./is.js')

module.exports.initMenuBar = (app, mainWindow) => {
  const template = [
    ...(is.mac
      ? [
          {
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
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Import iTunes Library...',
          click: () => {
            mainWindow.webContents.send('itunesImport')
          },
        },
        { type: 'separator' },
        is.mac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: (() => {
        const menu = [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
        ]
        if (is.mac) {
          menu.push({ role: 'selectAll' })
          menu.push({ type: 'separator' })
        } else {
          menu.push({ type: 'separator' })
          menu.push({ role: 'selectAll' })
        }
        menu.push({
          label: 'Filter',
          accelerator: 'CommandOrControl+F',
          click: () => {
            mainWindow.webContents.send('filter')
          },
        })
        return menu
      })(),
    },
    {
      label: 'Song',
      submenu: [{ label: 'TBA' }],
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
      label: 'Playback',
      submenu: [
        {
          label: 'Pause',
          // accelerator: 'Space',
          click: () => {
            mainWindow.webContents.send('playPause')
          },
        },
        { type: 'separator' },
        {
          label: 'Volume Up',
          accelerator: 'CommandOrControl+Up',
          click: () => {
            mainWindow.webContents.send('volumeUp')
          },
        },
        {
          label: 'Volume Down',
          accelerator: 'CommandOrControl+Down',
          click: () => {
            mainWindow.webContents.send('volumeDown')
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(is.mac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              // { role: 'window' },
            ]
          : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/probablykasper/ferrum')
          },
        },
      ],
    },
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
