import path from 'path'
import is from './is'
import addon from '../../ferrum-addon'

window.addon = addon
window.is_dev = is.dev
window.local_data_path = process.env.LOCAL_DATA
window.library_path = process.env.LIBRARY
window.is_mac = is.mac
window.is_windows = is.windows

window.join_paths = (...args) => {
	const combined_path = path.join(...args)
	return combined_path
}
