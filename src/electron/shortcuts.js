const { globalShortcut, dialog, systemPreferences } = require('electron')
const is = require('./is.js')

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

async function requestRecursively(msg = 'No accessibility permissions detected.') {
  const trusted = systemPreferences.isTrustedAccessibilityClient(false)
  if (trusted) {
    return true
  } else {
    const result = await dialog.showMessageBox({
      type: 'info',
      message: `${msg} To grant them, open System Preferences, click Security & Privacy, click Privacy, click Accessibility, then select Ferrum's checkbox`,
      buttons: ['Done', 'Cancel'],
      defaultId: 0,
    })
    if (result.response === 0) {
      return requestRecursively()
    } else {
      return false
    }
  }
}

module.exports.initMediaKeys = async (mainWindow) => {
  if (is.mac) {
    // prompt=true because of bug https://github.com/electron/electron/issues/20787
    let trusted = systemPreferences.isTrustedAccessibilityClient(false) // prompt
    if (trusted) return tryRegistering()
    const result = await dialog.showMessageBox({
      type: 'info',
      message: 'Ferrum needs accessibility permissions to exclusively take over media keys',
      buttons: ['Continue', 'Ignore'],
      defaultId: 0,
    })
    if (result.response === 0) {
      trusted = systemPreferences.isTrustedAccessibilityClient(true) // prompt
      await new Promise((resolve) => {
        setTimeout(resolve, 2000)
      })
      await requestRecursively('Click Done when you have granted Ferrum accessibility permissions.')
      tryRegistering()
    }
  } else {
    return tryRegistering()
  }
}
