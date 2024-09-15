import { app, ipcMain, session, BrowserWindow, dialog, protocol } from 'electron'
import is from './is'
import addon from '../../ferrum-addon'

if (is.dev) app.setName('Ferrum Dev')

import { init_menu_bar } from './menubar'
import { init_media_keys } from './shortcuts'
import('./ipc')
import path from 'path'

async function err_handler(msg: string, error: Error) {
	app.whenReady().then(() => {
		dialog.showMessageBoxSync({
			type: 'error',
			message: msg,
			detail: error.stack,
			title: 'Error',
		})
		err_handler(msg, error)
	})
}
process.on('uncaughtException', (error) => {
	err_handler('Unhandled Error', error)
})
process.on('unhandledRejection', (error: Error) => {
	err_handler('Unhandled Promise Rejection', error)
})

const app_data = app.getPath('appData')
if (is.dev) {
	const electron_data_path = path.join(app_data, 'space.kasper.ferrum.dev', 'Electron Data')
	app.setPath('userData', electron_data_path)
} else {
	const electron_data_path = path.join(app_data, 'space.kasper.ferrum', 'Electron Data')
	app.setPath('userData', electron_data_path)
}

let quitting = false
let app_loaded = false

app.on('window-all-closed', () => {
	app.quit()
})

app.whenReady().then(async () => {
	let main_window: BrowserWindow | null = new BrowserWindow({
		width: 1305,
		height: 1000,
		minWidth: 850,
		minHeight: 400,
		titleBarStyle: is.mac ? 'hidden' : 'default',
		webPreferences: {
			contextIsolation: false,
			nodeIntegration: true,
			preload: path.resolve(__dirname, './preload.js'),
		},
		backgroundColor: '#0D1115',
		show: false,
	})

	if (!is.dev) {
		await init_media_keys(main_window)
	}

	protocol.registerFileProtocol('track', (request, callback) => {
		const url = decodeURI(request.url)
		const path = url.substring(6)
		callback(path)
	})

	protocol.registerBufferProtocol('trackimg', (request, callback) => {
		const url = decodeURI(request.url)
		const path = url.substring(9)
		addon
			.read_cover_async_path(path, 0)
			.then((buffer) => {
				callback(Buffer.from(buffer))
			})
			.catch((error) => {
				callback({ error: 500 })
				console.log('Could not read cover', error)
			})
	})

	session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
		callback({
			responseHeaders: {
				...details.responseHeaders,
				'Content-Security-Policy': ["script-src 'self' 'unsafe-inline';"],
			},
		})
	})

	if (is.dev) main_window.loadURL(process.env.VITE_DEV_SERVER_URL || 'missing')
	else main_window.loadFile(path.resolve(__dirname, '../web/index.html'))

	if (is.dev) main_window.webContents.openDevTools()

	main_window.once('ready-to-show', () => {
		main_window?.show()
	})

	main_window.on('close', (e) => {
		if (!quitting) {
			e.preventDefault()
			app.hide()
		}
	})
	main_window.on('closed', () => {
		main_window = null
	})
	ipcMain.once('appLoaded', () => {
		app_loaded = true
	})

	// doesn't fire on Windows :(
	app.on('before-quit', () => {
		if (app_loaded) {
			main_window?.webContents.send('gonnaQuit')
			ipcMain.once('readyToQuit', () => {
				quitting = true
				main_window?.close()
			})
		} else {
			quitting = true
			main_window?.close()
		}
	})

	app.on('activate', () => {
		if (main_window !== null) {
			main_window.show()
		}
	})

	init_menu_bar(app, main_window)
})
