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
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(is.mac
          ? [
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
            ]
          : [
              // { role: 'delete' },
              { type: 'separator' },
              { role: 'selectAll' },
            ]),
      ],
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
