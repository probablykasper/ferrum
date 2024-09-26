import { ipc_renderer } from './window'

export function get_error_message(err: unknown): string {
	if (typeof err === 'object' && err !== null) {
		const obj = err as { [key: string]: unknown }
		if (obj.message) {
			return String(obj.message)
		} else if (obj.code) {
			return 'Code: ' + String(obj.message)
		}
	}
	return 'No reason or code provided'
}
function get_error_stack(err: unknown): string {
	if (typeof err === 'object' && err !== null) {
		const obj = err as { [key: string]: unknown }
		if (obj.stack) {
			return String(obj.stack)
		}
	}
	return ''
}
function error_popup(err: unknown) {
	ipc_renderer.invoke('showMessageBox', false, {
		type: 'error',
		message: get_error_message(err),
		detail: get_error_stack(err),
	})
}

export function call<T, P extends T | Promise<T>>(cb: (addon: typeof window.addon) => P): P {
	try {
		const result = cb(window.addon)
		if (result instanceof Promise) {
			return result.catch((err) => {
				error_popup(err)
				throw err
			}) as P
		} else {
			return result
		}
	} catch (err) {
		console.error('errorPopup:', err)
		error_popup(err)
		throw err
	}
}
