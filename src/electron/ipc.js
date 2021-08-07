const { ipcMain, dialog, Menu } = require('electron')

ipcMain.handle('showMessageBox', async (e, options) => {
  return await dialog.showMessageBox(options)
})

ipcMain.handle('showMessageBoxAttached', async (e, options) => {
  const window = e.sender.getOwnerBrowserWindow()
  return await dialog.showMessageBox(window, options)
})

ipcMain.handle('showOpenDialogAttached', async (e, options) => {
  const window = e.sender.getOwnerBrowserWindow()
  return await dialog.showOpenDialog(window, options)
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
      { type: 'separator' },
      {
        label: 'Add to Playlist',
        submenu: list,
      },
      {
        label: 'Remove from Playlist',
        click: () => resolve('Remove from Playlist'),
      },
      { type: 'separator' },
      {
        label: 'Get Info',
        click: () => resolve('Get Info'),
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
