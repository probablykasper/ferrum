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

ipcMain.handle('showTrackMenu', (e) => {
  return new Promise((resolve, reject) => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Add to Queue',
        click: () => resolve('Add to Queue'),
      },
      {
        label: 'Play Next',
        click: () => resolve('Play Next'),
      },
    ])
    menu.once('will-close', () => resolve())
    menu.popup()
  })
})
