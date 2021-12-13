const { ipcMain, dialog, Menu } = require('electron')

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

ipcMain.handle('showTrackMenu', (e, list) => {
  return new Promise((resolve, reject) => {
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
        label: 'Remove from Playlist',
        click: () => resolve('Remove from Playlist'),
      },
    ])
    menu.once('will-close', () => resolve())
    menu.popup()
  })
})

ipcMain.handle('showPlaylistMenu', (e, list) => {
  return new Promise((resolve, reject) => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'New Playlist',
        click: () => resolve('New Playlist'),
      },
    ])
    menu.once('will-close', () => resolve())
    menu.popup()
  })
})
