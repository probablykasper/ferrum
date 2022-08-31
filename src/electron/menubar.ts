import { Menu, shell } from 'electron'
import is from './is'

export function initMenuBar(app, mainWindow) {
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
          label: 'New Playlist',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('newPlaylist')
          },
        },
        {
          label: 'New Playlist Folder',
          click: () => {
            mainWindow.webContents.send('newPlaylistFolder')
          },
        },
        { type: 'separator' },
        {
          label: 'Import...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('import')
          },
        },
        { type: 'separator' },
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
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('filter')
          },
        })
        return menu
      })(),
    },
    {
      label: 'Song',
      submenu: [
        {
          label: 'Play Next',
          accelerator: '',
          click: () => {
            mainWindow.webContents.send('Play Next')
          },
        },
        {
          label: 'Add to Queue',
          accelerator: '',
          click: () => {
            mainWindow.webContents.send('Add to Queue')
          },
        },
        { type: 'separator' },
        {
          label: 'Get Info',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('Get Info')
          },
        },
        { type: 'separator' },
        {
          label: (() => {
            if (is.mac) return 'Reveal in Finder'
            else if (is.windows) return 'Reveal in File Explorer'
            else return 'Reveal in File Manager'
          })(),
          accelerator: 'Alt+CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.send('revealTrackFile')
          },
        },
        { type: 'separator' },
        {
          label: 'Remove from Playlist',
          accelerator: '',
          click: () => {
            mainWindow.webContents.send('Remove from Playlist')
          },
        },
        {
          label: 'Delete from Library',
          accelerator: 'CmdOrCtrl+Backspace',
          click: () => {
            mainWindow.webContents.send('Delete from Library')
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Queue',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            mainWindow.webContents.send('Toggle Queue')
          },
        },
        { type: 'separator' },
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
          accelerator: 'CmdOrCtrl+Up',
          click: () => {
            mainWindow.webContents.send('volumeUp')
          },
        },
        {
          label: 'Volume Down',
          accelerator: 'CmdOrCtrl+Down',
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
