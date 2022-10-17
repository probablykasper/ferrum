import { App, BrowserWindow, Menu, shell } from 'electron'
import type { MenuItemConstructorOptions } from 'electron/common'
import is from './is'
import type { WebContents } from './typed_ipc'

export function initMenuBar(app: App, mainWindow: BrowserWindow) {
  const webContents = mainWindow.webContents as WebContents
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
      visible: is.mac,
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Playlist',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            webContents.send('newPlaylist', 'root', false)
          },
        },
        {
          label: 'New Playlist Folder',
          click: () => {
            webContents.send('newPlaylist', 'root', true)
          },
        },
        { type: 'separator' },
        {
          label: 'Import...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            webContents.send('import')
          },
        },
        { type: 'separator' },
        {
          label: 'Import iTunes Library...',
          click: () => {
            webContents.send('itunesImport')
          },
        },
        { type: 'separator' },
        is.mac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: (() => {
        const menu: MenuItemConstructorOptions[] = [
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
            webContents.send('filter')
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
            webContents.send('selectedTracksAction', 'Play Next')
          },
        },
        {
          label: 'Add to Queue',
          accelerator: '',
          click: () => {
            webContents.send('selectedTracksAction', 'Add to Queue')
          },
        },
        { type: 'separator' },
        {
          label: 'Get Info',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            webContents.send('selectedTracksAction', 'Get Info')
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
            webContents.send('selectedTracksAction', 'revealTrackFile')
          },
        },
        { type: 'separator' },
        {
          label: 'Remove from Playlist',
          accelerator: '',
          click: () => {
            webContents.send('selectedTracksAction', 'Remove from Playlist')
          },
        },
        {
          label: 'Delete from Library',
          accelerator: 'CmdOrCtrl+Backspace',
          click: () => {
            webContents.send('selectedTracksAction', 'Delete from Library')
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
            webContents.send('Toggle Queue')
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
            webContents.send('playPause')
          },
        },
        { type: 'separator' },
        {
          label: 'Volume Up',
          accelerator: 'CmdOrCtrl+Up',
          click: () => {
            webContents.send('volumeUp')
          },
        },
        {
          label: 'Volume Down',
          accelerator: 'CmdOrCtrl+Down',
          click: () => {
            webContents.send('volumeDown')
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator', visible: is.mac },
        { role: 'front', visible: is.mac },
        { type: 'separator', visible: is.mac },
        { role: 'close', visible: !is.mac },
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
