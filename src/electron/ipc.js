const { ipcMain, dialog } = require('electron')

ipcMain.handle('showMessageBox', async (e, options) => {
  return await dialog.showMessageBox(options)
})

ipcMain.handle('showMessageBoxAttached', async (e, options) => {
  const window = e.sender.getOwnerBrowserWindow()
  return await dialog.showMessageBox(window, options)
})
