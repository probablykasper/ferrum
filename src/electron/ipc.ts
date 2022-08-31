import { ipcMain, dialog, Menu, shell, BrowserWindow } from 'electron'
import path from 'path'
import is from './is'

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

ipcMain.handle('showTrackMenu', (_e, list, playlist) => {
  return new Promise((resolve) => {
    for (const item of list) {
      item.click = () => resolve(item.id)
    }
    const menu = Menu.buildFromTemplate([
      {
        label: 'Play Next',
        click: () => resolve('Play Next'),
      },
      {
        label: 'Add to Queue',
        click: () => resolve('Add to Queue'),
      },
      {
        label: 'Add to Playlist',
        submenu: list,
      },
      { type: 'separator' },
      {
        label: 'Get Info',
        click: () => resolve('Get Info'),
      },
      { type: 'separator' },
      {
        label: (() => {
          if (is.mac) return 'Reveal in Finder'
          else if (is.windows) return 'Reveal in File Explorer'
          else return 'Reveal in File Manager'
        })(),
        click: () => resolve('revealTrackFile'),
      },
      { type: 'separator', visible: playlist === true },
      {
        label: 'Remove from Playlist',
        click: () => resolve('Remove from Playlist'),
        visible: playlist === true,
      },
    ])
    menu.once('menu-will-close', () => resolve(null))
    menu.popup()
  })
})

ipcMain.handle('showTracklistMenu', (e, isFolder, newOnly) => {
  return new Promise((resolve) => {
    const editMenu = [
      {
        label: 'Edit Details',
        click: () => resolve('Edit Details'),
      },
    ]
    const newMenu = [
      {
        label: 'New Playlist',
        click: () => resolve('New Playlist'),
      },
      {
        label: 'New Folder',
        click: () => resolve('New Folder'),
      },
    ]
    let menuItems: Electron.MenuItemConstructorOptions[] = editMenu
    if (newOnly) {
      menuItems = newMenu
    } else if (isFolder) {
      menuItems = [...editMenu, { type: 'separator' }, ...newMenu]
    }

    const menu = Menu.buildFromTemplate(menuItems)
    menu.once('menu-will-close', () => resolve(null))
    menu.popup()
  })
})
