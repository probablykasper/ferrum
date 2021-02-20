const { globalShortcut, dialog, systemPreferences } = require('electron')
const is = require('./is.js')

module.exports.initMediaKeys = async (mainWindow) => {
  function tryRegistering() {
    globalShortcut.register('MediaPlayPause', () => {
      mainWindow.webContents.send('playPause')
    })
    globalShortcut.register('MediaNextTrack', () => {
      mainWindow.webContents.send('next')
    })
    globalShortcut.register('MediaPreviousTrack', () => {
      mainWindow.webContents.send('previous')
    })
    globalShortcut.register('MediaStop', () => {
      mainWindow.webContents.send('stop')
    })
  }
  tryRegistering()
  if (is.mac && !globalShortcut.isRegistered('MediaPlayPause')) {
    const id = await dialog.showMessageBox({
      type: 'info',
      message: 'Ferrum needs accessibility permissions to exclusively take over media keys',
      buttons: ['Continue', 'Ignore'],
      defaultId: 0,
    })
    tryRegistering()
    if (id === 0) {
      systemPreferences.isTrustedAccessibilityClient(true)
      return 'openSysPref'
    }
  }
}
