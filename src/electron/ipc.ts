import { ipcMain, dialog, Menu, shell, BrowserWindow } from 'electron'
import path from 'path'
import is from './is'
import type { ShowTracklistMenuArgs, ShowTrackMenuArgs } from './types'

ipcMain.handle('showMessageBox', async (e, options) => {
  return await dialog.showMessageBox(options)
})

ipcMain.handle('showMessageBoxAttached', async (e, options) => {
  const window = BrowserWindow.fromWebContents(e.sender)
  if (window) {
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

ipcMain.handle('showTrackMenu', (e, args: ShowTrackMenuArgs) => {
  let queueMenu: Electron.MenuItemConstructorOptions[] = []
  if (args.queue) {
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
  const selectedIds = args.selectedIndexes.map((i) => args.allIds[i])
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
      submenu: args.lists.map((item) => {
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
        e.sender.send('context.Get Info', args.allIds, args.selectedIndexes[0])
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
    { type: 'separator', visible: args.playlist?.editable === true },
    {
      label: 'Remove from Playlist',
      click: () => e.sender.send('context.Remove from Playlist', args.selectedIndexes),
      visible: args.playlist?.editable === true,
    },
  ])
  menu.popup()
})

ipcMain.handle('showTracklistMenu', (e, args: ShowTracklistMenuArgs) => {
  const editMenu = [
    {
      label: 'Edit Details',
      click: () => e.sender.send('context.playlist.edit', args),
    },
  ]
  const newMenu = [
    {
      label: 'New Playlist',
      click: () => e.sender.send('context.playlist.new', args),
    },
    {
      label: 'New Folder',
      click: () => e.sender.send('context.playlist.new', args),
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
