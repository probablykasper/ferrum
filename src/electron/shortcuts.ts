import { globalShortcut, dialog, systemPreferences, BrowserWindow } from 'electron'
import is from './is'
import type { WebContents } from './typed_ipc'

function try_registering(main_window: BrowserWindow) {
	const web_contents = main_window.webContents as WebContents
	const success1 = globalShortcut.register('MediaPlayPause', () => {
		if (main_window !== null) web_contents.send('playPause')
	})
	if (!success1) return false
	globalShortcut.register('MediaNextTrack', () => {
		if (main_window !== null) web_contents.send('Next')
	})
	globalShortcut.register('MediaPreviousTrack', () => {
		if (main_window !== null) web_contents.send('Previous')
	})
	globalShortcut.register('MediaStop', () => {
		if (main_window !== null) web_contents.send('Stop')
	})
	return true
}

async function request_loop(main_window: BrowserWindow) {
	let first_request = true
	for (;;) {
		let msg = 'No accessibility permissions detected.'
		if (!first_request) {
			msg = 'Click Done when you have granted Ferrum accessibility permissions.'
		} else {
			first_request = true
		}
		const result = await dialog.showMessageBox(main_window, {
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

async function get_trusted_accesibility_macos(main_window: BrowserWindow) {
	const result = await dialog.showMessageBox(main_window, {
		type: 'info',
		message: 'Ferrum needs accessibility permissions to exclusively take over the media keys',
		buttons: ['Continue', 'Ignore'],
		defaultId: 0,
	})
	if (result.response === 0) {
		setTimeout(() => {
			systemPreferences.isTrustedAccessibilityClient(true) // prompt
		}, 500)
		await request_loop(main_window)
		try_registering(main_window)
	}
}

export async function init_media_keys(main_window: BrowserWindow) {
	const success = try_registering(main_window)
	if (!success) {
		if (is.mac) {
			if (systemPreferences.isTrustedAccessibilityClient(false)) {
				await dialog.showMessageBox(main_window, {
					type: 'info',
					message: 'Could not register media key shortcuts',
				})
			} else {
				await get_trusted_accesibility_macos(main_window)
			}
		} else {
			await dialog.showMessageBox(main_window, {
				type: 'info',
				message: 'Could not register media key shortcuts',
			})
		}
	}
}
