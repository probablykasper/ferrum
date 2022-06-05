const { globalShortcut, dialog, systemPreferences } = require('electron')
const is = require('./is.js')

function tryRegistering(mainWindow) {
  let success1 = globalShortcut.register('MediaPlayPause', () => {
    if (mainWindow !== null) mainWindow.webContents.send('playPause')
  })
  if (!success1) return false
  globalShortcut.register('MediaNextTrack', () => {
    if (mainWindow !== null) mainWindow.webContents.send('next')
  })
  globalShortcut.register('MediaPreviousTrack', () => {
    if (mainWindow !== null) mainWindow.webContents.send('previous')
  })
  globalShortcut.register('MediaStop', () => {
    if (mainWindow !== null) mainWindow.webContents.send('stop')
  })
  return true
}

async function requestLoop(mainWindow) {
  let firstRequest = true
  for (;;) {
    let msg = 'No accessibility permissions detected.'
    if (!firstRequest) {
      msg = 'Click Done when you have granted Ferrum accessibility permissions.'
    } else {
      firstRequest = true
    }
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      message: `${msg} To grant them, open System Preferences, click Security & Privacy, click Privacy, click Accessibility, then select Ferrum's checkbox`,
      buttons: ['Done', 'Cancel'],
      defaultId: 0,
    })
    if (result.response === 1 || systemPreferences.isTrustedAccessibilityClient(true)) {
      return
    }
  }
}

async function getTrustedAccessibilityMacOS(mainWindow) {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    message: 'Ferrum needs accessibility permissions to exclusively take over the media keys',
    buttons: ['Continue', 'Ignore'],
    defaultId: 0,
  })
  if (result.response === 0) {
    setTimeout(() => {
      systemPreferences.isTrustedAccessibilityClient(true) // prompt
    }, 500)
    await requestLoop(mainWindow)
    tryRegistering(mainWindow)
  }
}

async function initMediaKeys(mainWindow) {
  let success = tryRegistering(mainWindow)
  if (!success) {
    if (is.mac) {
      if (systemPreferences.isTrustedAccessibilityClient(false)) {
        await dialog.showMessageBox(mainWindow, {
          type: 'info',
          message: 'Could not register media key shortcuts',
        })
      } else {
        await getTrustedAccessibilityMacOS(mainWindow)
      }
    } else {
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        message: 'Could not register media key shortcuts',
      })
    }
  }
}
module.exports = { initMediaKeys }
