import type { IpcRenderer, IpcFunctions } from '@/electron/typed_ipc'
import type Addon from 'ferrum-addon/addon'
const electron = window.require('electron')

export const ipc_renderer = electron.ipcRenderer as IpcRenderer

export const ipc_listen: IpcFunctions['ipcListen'] = (channel, listener) => {
	ipc_renderer.on(channel, listener)
	return () => {
		ipc_renderer.removeListener(channel, listener)
	}
}

declare global {
	interface Window {
		addon: typeof Addon
		is_dev: boolean
		local_data_path?: string
		library_path?: string
		is_mac: boolean
		is_windows: boolean
		join_paths: (...args: string[]) => string
		path_to_file_url: (path: string) => string
	}
}

export const join_paths = window.join_paths
export const path_to_file_url = window.path_to_file_url
