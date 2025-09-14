import { globalShortcut, systemPreferences } from 'electron'
import is from './is'
import { browser_windows } from './main'

let was_success = false
function try_registering() {
	if (was_success) {
		return true
	}
	const web_contents = browser_windows.main_window?.webContents
	const success1 = globalShortcut.register('MediaPlayPause', () => {
		web_contents?.send('playPause')
	})
	if (!success1) return false
	globalShortcut.register('MediaNextTrack', () => {
		web_contents?.send('Next')
	})
	globalShortcut.register('MediaPreviousTrack', () => {
		web_contents?.send('Previous')
	})
	globalShortcut.register('MediaStop', () => {
		web_contents?.send('Stop')
	})
	was_success = true
	return true
}

export async function init_media_keys(prompt: boolean) {
	const success = try_registering()
	if (!success) {
		if (is.mac) {
			if (systemPreferences.isTrustedAccessibilityClient(prompt)) {
				return { error: 'Could not register media key shortcuts' }
			} else {
				return { needs_accessibility_permission: true }
			}
		} else {
			return { error: 'Could not register media key shortcuts' }
		}
	}
	return null
}
