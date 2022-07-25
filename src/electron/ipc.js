/* eslint-disable @typescript-eslint/no-var-requires */
const { ipcMain, dialog, Menu, shell } = require('electron')
const path = require('path')
const is = require('./is.js')

ipcMain.handle('showMessageBox', async (e, options) => {
  return await dialog.showMessageBox(options)
})

ipcMain.handle('showMessageBoxAttached', async (e, options) => {
  const window = e.sender.getOwnerBrowserWindow()
  return await dialog.showMessageBox(window, options)
})

ipcMain.handle('showOpenDialog', async (e, attached, options) => {
  const window = e.sender.getOwnerBrowserWindow()
  if (attached === true) {
    return await dialog.showOpenDialog(window, options)
  } else {
    return await dialog.showOpenDialog(options)
  }
})

ipcMain.handle('revealTrackFile', async (e, ...paths) => {
  shell.showItemInFolder(path.join(...paths))
})

ipcMain.handle('showTrackMenu', (_e, list) => {
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
      { type: 'separator' },
      {
        label: 'Remove from Playlist',
        click: () => resolve('Remove from Playlist'),
      },
    ])
    menu.once('will-close', () => resolve())
    menu.popup()
  })
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
ipcMain.handle('showPlaylistMenu', (_e, _list) => {
  return new Promise((resolve) => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'New Playlist',
        click: () => resolve('New Playlist'),
      },
      {
        label: 'New Folder',
        click: () => resolve('New Playlist Folder'),
      },
    ])
    menu.once('will-close', () => resolve())
    menu.popup()
  })
})
