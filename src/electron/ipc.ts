import { dialog, Menu, shell, BrowserWindow } from 'electron'
import { ipcMain } from './typed_ipc'
import path from 'path'
import is from './is'

ipcMain.handle('showMessageBox', async (e, attached, options) => {
  const window = BrowserWindow.fromWebContents(e.sender)
  if (attached && window) {
    return await dialog.showMessageBox(window, options)
  } else {
    return await dialog.showMessageBox(options)
  }
})

ipcMain.handle('showOpenDialog', async (e, attached, options) => {
  const window = BrowserWindow.fromWebContents(e.sender)
  if (attached === true && window) {
    return await dialog.showOpenDialog(window, options)
  } else {
    return await dialog.showOpenDialog(options)
  }
})

ipcMain.handle('revealTrackFile', async (e, ...paths) => {
  shell.showItemInFolder(path.join(...paths))
})

ipcMain.handle('showTrackMenu', (e, options) => {
  let queueMenu: Electron.MenuItemConstructorOptions[] = []
  if (options.queue) {
    queueMenu = [
      {
        label: 'Remove from Queue',
        click: () => {
          e.sender.send('context.Remove from Queue')
        },
      },
      { type: 'separator' },
    ]
  }
  const selectedIds = options.selectedIndexes.map((i) => options.allIds[i])
  const menu = Menu.buildFromTemplate([
    ...queueMenu,
    {
      label: 'Play Next',
      click: () => {
        e.sender.send('context.Play Next', selectedIds)
      },
    },
    {
      label: 'Add to Queue',
      click: () => {
        e.sender.send('context.Add to Queue', selectedIds)
      },
    },
    {
      label: 'Add to Playlist',
      submenu: options.lists.map((item) => {
        return {
          ...item,
          click: () => e.sender.send('context.Add to Playlist', item.id, selectedIds),
        }
      }),
    },
    { type: 'separator' },
    {
      label: 'Get Info',
      click: () => {
        e.sender.send('context.Get Info', options.allIds, options.selectedIndexes[0])
      },
    },
    { type: 'separator' },
    {
      label: (() => {
        if (is.mac) return 'Reveal in Finder'
        else if (is.windows) return 'Reveal in File Explorer'
        else return 'Reveal in File Manager'
      })(),
      click: () => e.sender.send('context.revealTrackFile', selectedIds[0]),
    },
    { type: 'separator', visible: options.playlist?.editable === true },
    {
      label: 'Remove from Playlist',
      click: () => e.sender.send('context.Remove from Playlist', options.selectedIndexes),
      visible: options.playlist?.editable === true,
    },
  ])
  menu.popup()
})

ipcMain.handle('showTracklistMenu', (e, args) => {
  const editMenu = [
    {
      label: 'Edit Details',
      click: () => e.sender.send('context.playlist.edit', args.id),
    },
  ]
  const newMenu = [
    {
      label: 'New Playlist',
      click: () => e.sender.send('newPlaylist', args.id, false),
    },
    {
      label: 'New Folder',
      click: () => e.sender.send('newPlaylist', args.id, true),
    },
  ]
  let menuItems: Electron.MenuItemConstructorOptions[] = editMenu
  if (args.isRoot) {
    menuItems = newMenu
  } else if (args.isFolder) {
    menuItems = [...editMenu, { type: 'separator' }, ...newMenu]
  }

  const menu = Menu.buildFromTemplate(menuItems)
  menu.popup()
})
