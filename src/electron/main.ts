import { app, ipcMain, session, BrowserWindow, dialog, protocol, net } from 'electron'
import is from './is'
import addon from '../../ferrum-addon'

if (is.dev) app.setName('Ferrum Dev')

import { init_menu_bar } from './menubar'
import { init_media_keys } from './shortcuts'
import('./ipc')
import path from 'path'
import url from 'url'
import { ipc_main } from './typed_ipc'

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
const local_data_path = process.env.LOCAL_DATA ? path.resolve(process.env.LOCAL_DATA) : null
if (is.dev) {
	const data_path = local_data_path ?? path.join(__dirname, '../../src-native/appdata/local_data')
	const electron_data_path = path.join(data_path, 'Electron Data')
	app.setPath('userData', electron_data_path)
} else {
	const data_path = local_data_path ?? path.join(app_data, 'space.kasper.ferrum')
	const electron_data_path = path.join(data_path, 'Electron Data')
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
			.read_cache_cover_async(path, 0)
			.then((buffer) => {
				if (buffer === null) {
					callback({ error: 404 })
				} else {
					callback(Buffer.from(buffer))
				}
			})
			.catch((error) => {
				callback({ error: 500 })
				console.log(`Could not read cover "${path}":`, error)
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

	const vite_dev_server_url = process.env.VITE_DEV_SERVER_URL ?? ''
	if (is.dev && !vite_dev_server_url) {
		throw new Error('VITE_DEV_SERVER_URL missing')
	}

	const web_folder = path.join(path.dirname(__dirname), 'web')

	protocol.handle('app', (request) => {
		const accepts_html =
			request.headers
				.get('accept')
				?.split(',')
				.map((mime_type) => mime_type.trim())
				.includes('text/html') ?? false

		if (request.method === 'GET' && accepts_html) {
			const html_path = url.pathToFileURL(path.join(web_folder, 'index.html')).toString()
			return net.fetch(html_path)
		}

		const file_path = request.url.slice('app:'.length)
		const file_url = url.pathToFileURL(path.join(web_folder, file_path)).toString()
		return net.fetch(file_url)
	})

	if (is.dev) {
		main_window.loadURL(new URL(vite_dev_server_url).origin + '/playlist/root')
	} else {
		main_window.loadURL('app:/playlist/root')
	}

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
	ipc_main.handle('app_loaded', () => {
		app_loaded = true
	})

	// doesn't always fire on Windows :(
	app.on('before-quit', (e) => {
		if (quitting) {
			return
		} else if (app_loaded) {
			console.log('Preparing to quit')
			e.preventDefault()
			main_window?.webContents.send('gonnaQuit')
			ipcMain.once('readyToQuit', () => {
				console.log('Quitting gracefully')
				quitting = true
				main_window?.close()
			})
		} else {
			console.log('Quitting immediately')
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
