import path from 'path'
import url from 'url'
import is from './is'
import addon from '../../ferrum-addon'

window.addon = addon
window.is_dev = is.dev
window.local_data_path = process.env.LOCAL_DATA ? path.resolve(process.env.LOCAL_DATA) : undefined
window.library_path = process.env.LIBRARY ? path.resolve(process.env.LIBRARY) : undefined
window.is_mac = is.mac
window.is_windows = is.windows

window.join_paths = (...args) => {
	return path.join(...args)
}
window.path_to_file_url = (path: string) => {
	return url.pathToFileURL(path).toString()
}
