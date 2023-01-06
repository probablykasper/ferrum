import { globalShortcut, dialog, systemPreferences, BrowserWindow } from 'electron'
import is from './is'
import type { WebContents } from './typed_ipc'

function tryRegistering(mainWindow: BrowserWindow) {
  const webContents = mainWindow.webContents as WebContents
  const success1 = globalShortcut.register('MediaPlayPause', () => {
    if (mainWindow !== null) webContents.send('playPause')
  })
  if (!success1) return false
  globalShortcut.register('MediaNextTrack', () => {
    if (mainWindow !== null) webContents.send('Next')
  })
  globalShortcut.register('MediaPreviousTrack', () => {
    if (mainWindow !== null) webContents.send('Previous')
  })
  globalShortcut.register('MediaStop', () => {
    if (mainWindow !== null) webContents.send('Stop')
  })
  return true
}

async function requestLoop(mainWindow: BrowserWindow) {
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

async function getTrustedAccessibilityMacOS(mainWindow: BrowserWindow) {
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

export async function initMediaKeys(mainWindow: BrowserWindow) {
  const success = tryRegistering(mainWindow)
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
