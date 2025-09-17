console.log('Preload running')
import path from 'path'
import is from './is'
const addon = await import(path.join(import.meta.dirname, '../../ferrum-addon/main'), {
	assert: { type: 'node' },
})

window.addon = addon
window.is_dev = is.dev
window.local_data_path = process.env.LOCAL_DATA ? path.resolve(process.env.LOCAL_DATA) : undefined
window.library_path = process.env.LIBRARY ? path.resolve(process.env.LIBRARY) : undefined
window.is_mac = is.mac
window.is_windows = is.windows
