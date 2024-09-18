import { dialog, Menu, shell, BrowserWindow } from 'electron'
import { ipc_main } from './typed_ipc'
import path from 'path'
import is from './is'

ipc_main.handle('showMessageBox', async (e, attached, options) => {
	const window = BrowserWindow.fromWebContents(e.sender)
	if (attached && window) {
		return await dialog.showMessageBox(window, options)
	} else {
		return await dialog.showMessageBox(options)
	}
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

ipc_main.handle('showTrackMenu', (e, options) => {
	let queue_menu: Electron.MenuItemConstructorOptions[] = []
	if (options.queue) {
		queue_menu = [
			{
				label: 'Remove from Queue',
				click: () => {
					e.sender.send('context.Remove from Queue')
				},
			},
			{ type: 'separator' },
		]
	}
	const selected_ids = options.selectedIndexes.map((i) => options.allIds[i])
	const menu = Menu.buildFromTemplate([
		...queue_menu,
		{
			label: 'Play Next',
			click: () => {
				e.sender.send('context.Play Next', selected_ids)
			},
		},
		{
			label: 'Add to Queue',
			click: () => {
				e.sender.send('context.Add to Queue', selected_ids)
			},
		},
		{
			label: 'Add to Playlist',
			submenu: options.lists.map((item) => {
				return {
					...item,
					click: () => e.sender.send('context.Add to Playlist', item.id, selected_ids),
				}
			}),
		},
		{ type: 'separator' },
		{
			label: 'Get Info',
			click: () => {
				e.sender.send('context.Get Info', options.allIds, options.selectedIndexes[0])
			},
		},
		{ type: 'separator' },
		{
			label: (() => {
				if (is.mac) return 'Reveal in Finder'
				else if (is.windows) return 'Reveal in File Explorer'
				else return 'Reveal in File Manager'
			})(),
			click: () => e.sender.send('context.revealTrackFile', selected_ids[0]),
		},
		{ type: 'separator', visible: options.playlist?.editable === true },
		{
			label: 'Remove from Playlist',
			click: () => e.sender.send('context.Remove from Playlist', options.selectedIndexes),
			visible: options.playlist?.editable === true,
		},
	])
	menu.popup()
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
	const menu = Menu.buildFromTemplate(
		args.menu.map((item) => {
			item.click = (item) => {
				e.sender.send('context.toggle_column', {
					id: item.id,
					label: item.label,
					checked: item.checked,
				})
			}
			return item
		}),
	)
	menu.popup()
})
