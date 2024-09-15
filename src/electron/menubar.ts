import { type App, BrowserWindow, Menu, shell, dialog } from 'electron'
import { ipcMain } from './typed_ipc'
import type { MenuItemConstructorOptions } from 'electron/common'
import is from './is'
import type { WebContents } from './typed_ipc'

export async function handle_missing(id: string) {
	dialog.showMessageBoxSync({
		type: 'error',
		message: 'Missing ID ' + id,
		detail: 'Please let me know what happened',
		title: 'Error',
	})
}

export function initMenuBar(app: App, mainWindow: BrowserWindow) {
	const webContents = mainWindow.webContents as WebContents
	const template: MenuItemConstructorOptions[] = [
		{
			label: app.name,
			submenu: [
				{ role: 'about' },
				{ type: 'separator' },
				{ role: 'services' },
				{ type: 'separator' },
				{ role: 'hide' },
				{ role: 'hideOthers' },
				{ role: 'unhide' },
				{ type: 'separator' },
				{ role: 'quit' },
			],
			visible: is.mac,
		},
		{
			label: 'File',
			submenu: [
				{
					label: 'New Playlist',
					accelerator: 'CmdOrCtrl+N',
					click: () => {
						webContents.send('newPlaylist', 'root', false)
					},
				},
				{
					label: 'New Playlist Folder',
					click: () => {
						webContents.send('newPlaylist', 'root', true)
					},
				},
				{ type: 'separator' },
				{
					label: 'Import...',
					accelerator: 'CmdOrCtrl+O',
					click: () => {
						webContents.send('import')
					},
				},
				{ type: 'separator' },
				{
					label: 'Import iTunes Library...',
					click: () => {
						webContents.send('itunesImport')
					},
				},
				{ type: 'separator' },
				is.mac ? { role: 'close' } : { role: 'quit' },
			],
		},
		{
			label: 'Edit',
			submenu: (() => {
				const menu: MenuItemConstructorOptions[] = [
					{ role: 'undo' },
					{ role: 'redo' },
					{ type: 'separator' },
					{ role: 'cut' },
					{ role: 'copy' },
					{ role: 'paste' },
				]
				if (is.mac) {
					menu.push({ role: 'selectAll' })
					menu.push({ type: 'separator' })
				} else {
					menu.push({ type: 'separator' })
					menu.push({ role: 'selectAll' })
				}
				menu.push({
					label: 'Filter',
					accelerator: 'CmdOrCtrl+F',
					click: () => {
						webContents.send('filter')
					},
				})
				return menu
			})(),
		},
		{
			label: 'Song',
			submenu: [
				{
					label: 'Play Next',
					accelerator: '',
					click: () => {
						webContents.send('selectedTracksAction', 'Play Next')
					},
				},
				{
					label: 'Add to Queue',
					accelerator: '',
					click: () => {
						webContents.send('selectedTracksAction', 'Add to Queue')
					},
				},
				{ type: 'separator' },
				{
					label: 'Get Info',
					accelerator: 'CmdOrCtrl+I',
					click: () => {
						webContents.send('selectedTracksAction', 'Get Info')
					},
				},
				{ type: 'separator' },
				{
					label: (() => {
						if (is.mac) return 'Reveal in Finder'
						else if (is.windows) return 'Reveal in File Explorer'
						else return 'Reveal in File Manager'
					})(),
					accelerator: 'Shift+CmdOrCtrl+R',
					click: () => {
						webContents.send('selectedTracksAction', 'revealTrackFile')
					},
				},
				{ type: 'separator' },
				{
					label: 'Remove from Playlist',
					accelerator: '',
					click: () => {
						webContents.send('selectedTracksAction', 'Remove from Playlist')
					},
				},
				{
					label: 'Delete from Library',
					accelerator: 'CmdOrCtrl+Backspace',
					click: () => {
						webContents.send('selectedTracksAction', 'Delete from Library')
					},
				},
			],
		},
		{
			label: 'View',
			submenu: [
				{
					label: 'Show Queue',
					id: 'Show Queue',
					type: 'checkbox',
					accelerator: 'CmdOrCtrl+U',
					click: () => {
						webContents.send('Show Queue')
					},
				},
				{
					label: 'Toggle Quick Nav',
					type: 'checkbox',
					accelerator: 'CmdOrCtrl+K',
					click: () => {
						webContents.send('ToggleQuickNav')
					},
				},
				{
					label: 'Group Album Tracks',
					type: 'checkbox',
					checked: true,
					click: (item) => {
						webContents.send('Group Album Tracks', item.checked)
					},
				},
				{ type: 'separator' },
				{ role: 'reload', accelerator: 'CmdOrCtrl+Option+R' },
				{ role: 'forceReload', accelerator: 'Shift+CmdOrCtrl+Option+R' },
				{ role: 'toggleDevTools' },
				{ type: 'separator' },
				{ role: 'resetZoom' },
				{ role: 'zoomIn' },
				{ role: 'zoomOut' },
				{ type: 'separator' },
				{ role: 'togglefullscreen' },
			],
		},
		{
			label: 'Playback',
			submenu: [
				{
					label: 'Pause',
					// no accelerator because it's unreliable
					click: () => {
						webContents.send('playPause')
					},
				},
				{
					label: 'Next',
					accelerator: 'CmdOrCtrl+Right',
					click: () => {
						webContents.send('Next')
					},
				},
				{
					label: 'Previous',
					accelerator: 'CmdOrCtrl+Left',
					click: () => {
						webContents.send('Previous')
					},
				},
				{ type: 'separator' },
				{
					label: 'Shuffle',
					id: 'Shuffle',
					type: 'checkbox',
					accelerator: 'CmdOrCtrl+S',
					click: () => {
						webContents.send('Shuffle')
					},
				},
				{
					label: 'Repeat',
					id: 'Repeat',
					type: 'checkbox',
					accelerator: 'CmdOrCtrl+R',
					click: () => {
						webContents.send('Repeat')
					},
				},
				{ type: 'separator' },
				{
					id: 'Volume Up',
					label: 'Volume Up',
					accelerator: 'CmdOrCtrl+Up',
					click: () => {
						webContents.send('volumeUp')
					},
				},
				{
					id: 'Volume Down',
					label: 'Volume Down',
					accelerator: 'CmdOrCtrl+Down',
					click: () => {
						webContents.send('volumeDown')
					},
				},
			],
		},
		{
			label: 'Window',
			submenu: [
				{
					id: 'Select Next List',
					label: 'Select Next List',
					accelerator: 'Ctrl+Tab',
					click: () => {
						webContents.send('Select Next List')
					},
				},
				{
					id: 'Select Previous List',
					label: 'Select Previous List',
					accelerator: 'Ctrl+Shift+Tab',
					click: () => {
						webContents.send('Select Previous List')
					},
				},
				{ type: 'separator', visible: is.mac },
				{ role: 'minimize' },
				{ role: 'zoom' },
				{ type: 'separator', visible: is.mac },
				{ role: 'front', visible: is.mac },
				{ type: 'separator', visible: is.mac },
				{ role: 'close', visible: !is.mac },
			],
		},
		{
			role: 'help',
			submenu: [
				{
					label: 'Learn More',
					click: async () => {
						await shell.openExternal('https://github.com/probablykasper/ferrum')
					},
				},
			],
		},
	]
	const menu = Menu.buildFromTemplate(template)
	Menu.setApplicationMenu(menu)

	ipcMain.handle('update:Shuffle', (_, checked) => {
		const item = menu.getMenuItemById('Shuffle')
		if (!item) return handle_missing('Shuffle')
		item.checked = checked
	})
	ipcMain.handle('update:Repeat', (_, checked) => {
		const item = menu.getMenuItemById('Repeat')
		if (!item) return handle_missing('Repeat')
		item.checked = checked
	})
	ipcMain.handle('update:Show Queue', (_, checked) => {
		const item = menu.getMenuItemById('Show Queue')
		if (!item) return handle_missing('Show Queue')
		item.checked = checked
	})
}
