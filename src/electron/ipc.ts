import { dialog, Menu, shell, BrowserWindow } from 'electron'
import { ipc_main } from './typed_ipc'
import path from 'path'
import is from './is'
import { check_for_updates } from './update'
import { init_media_keys } from './shortcuts'
import { trigger_crash } from './main'

ipc_main.handle('check_for_updates', (_e) => {
	return check_for_updates() ?? null
})

ipc_main.handle('open_url', (_e, url) => {
	console.log('open_url', url)

	shell.openExternal(url)
})

ipc_main.handle('showMessageBox', async (e, attached, options, crash) => {
	const window = BrowserWindow.fromWebContents(e.sender)
	let result: Awaited<ReturnType<typeof dialog.showMessageBox>>
	if (attached && window) {
		result = await dialog.showMessageBox(window, options)
	} else {
		result = await dialog.showMessageBox(options)
	}
	if (crash) {
		trigger_crash()
	}
	return result
})

ipc_main.handle('showOpenDialog', async (e, attached, options) => {
	const window = BrowserWindow.fromWebContents(e.sender)
	if (attached && window) {
		return await dialog.showOpenDialog(window, options)
	} else {
		return await dialog.showOpenDialog(options)
	}
})

ipc_main.handle('revealTrackFile', async (_e, ...paths) => {
	shell.showItemInFolder(path.join(...paths))
})

ipc_main.handle('volume_change', async (_e, up) => {
	if (up) {
		Menu.getApplicationMenu()?.getMenuItemById('Volume Up')?.click()
	} else {
		Menu.getApplicationMenu()?.getMenuItemById('Volume Down')?.click()
	}
})

ipc_main.handle('init_media_keys', async (_e, prompt) => {
	return await init_media_keys(prompt)
})

ipc_main.handle('show_tracks_menu', (e, options) => {
	return new Promise((resolve) => {
		const menu = Menu.buildFromTemplate([
			{
				label: 'Remove from Queue',
				click: () => {
					e.sender.send('context.Remove from Queue')
				},
				visible: options.queue,
			},
			{ type: 'separator', visible: options.queue },
			{
				label: 'Play Next',
				click: () => resolve('Play Next'),
			},
			{
				label: 'Add to Queue',
				click: () => resolve('Add to Queue'),
			},
			{
				label: 'Add to Playlist',
				submenu: options.lists.map((item) => {
					return {
						...item,
						click: () => resolve({ action: 'Add to Playlist', playlist_id: item.id }),
					}
				}),
			},
			{ type: 'separator' },
			{
				label: 'Get Info',
				click: () => resolve('Get Info'),
			},
			{ type: 'separator' },
			{
				label: (() => {
					if (is.mac) return 'Reveal in Finder'
					else if (is.windows) return 'Reveal in File Explorer'
					else return 'Reveal in File Manager'
				})(),
				click: () => resolve('reveal_track_file'),
			},
			{ type: 'separator', visible: options.is_editable_playlist === true },
			{
				label: 'Remove from Playlist',
				click: () => resolve('Remove from Playlist'),
				visible: options.is_editable_playlist === true,
			},
		])
		menu.popup({
			callback: () => resolve(null),
		})
	})
})

ipc_main.handle('showTracklistMenu', (e, args) => {
	const edit_menu = [
		{
			label: 'Edit Details',
			click: () => e.sender.send('context.playlist.edit', args.id),
		},
		{
			label: 'Delete',
			click: () => e.sender.send('context.playlist.delete', args.id),
		},
	]
	const new_menu = [
		{
			label: 'New Playlist',
			click: () => e.sender.send('newPlaylist', args.id, false),
		},
		{
			label: 'New Folder',
			click: () => e.sender.send('newPlaylist', args.id, true),
		},
	]
	let menu_items: Electron.MenuItemConstructorOptions[] = edit_menu
	if (args.isRoot) {
		menu_items = new_menu
	} else if (args.isFolder) {
		menu_items = [...edit_menu, { type: 'separator' }, ...new_menu]
	}

	const menu = Menu.buildFromTemplate(menu_items)
	menu.popup()
})

ipc_main.handle('show_columns_menu', (e, args) => {
	const menu = Menu.buildFromTemplate([
		{
			label: 'Filter by this field',
			click: () => {
				e.sender.send('filter', (args.column_filter ?? 'error') + ':')
			},
			visible: args.column_filter !== null,
		},
		{ type: 'separator', visible: args.column_filter !== null },
		...args.menu.map((item) => {
			item.click = (item) => {
				e.sender.send('context.toggle_column', {
					id: item.id,
					label: item.label,
					checked: item.checked,
				})
			}
			return item
		}),
	])
	menu.popup()
})
