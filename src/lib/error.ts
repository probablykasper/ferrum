import { ipc_renderer } from './window'

export function get_error_message(err: unknown): string {
	if (typeof err === 'object' && err !== null) {
		const obj = err as { [key: string]: unknown }
		if (obj.message) {
			return String(obj.message)
		} else if (obj.code) {
			return 'Code: ' + String(obj.message)
		}
	} else if (typeof err === 'string') {
		return err
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
export function error_popup(err: unknown, crash = false) {
	ipc_renderer.invoke(
		'showMessageBox',
		false,
		{
			type: 'error',
			message: get_error_message(err),
			detail: get_error_stack(err),
		},
		crash,
	)
}

/** @deprecated */
export function call<T, P extends T | Promise<T>>(cb: (addon: typeof window.addon) => P): P {
	try {
		const result = cb(window.addon)
		if (result instanceof Promise) {
			return result.catch((err) => {
				console.error(err)
				error_popup(err)
				throw err
			}) as P
		} else {
			return result
		}
	} catch (err) {
		console.error(err)
		error_popup(err)
		throw err
	}
}

// Crashes on error
export function strict_call<T>(cb: (addon: typeof window.addon) => T): T {
	try {
		const result = cb(window.addon)

		// Handle async errors
		if (result instanceof Promise) {
			return result.catch((error) => {
				error_popup(error, true)
				throw error
			}) as T
		}

		// Handle synchronous result
		return result
	} catch (raw_err) {
		let error: Error
		if (raw_err instanceof Error) {
			error = raw_err
		} else {
			error = new Error('Unexpected error: ' + String(raw_err))
		}
		// Handle synchronous errors
		error_popup(error, true)
		throw error
	}
}

type BaseResult<T> = { data: T; error: null } | { data: null; error: Error }
type PromiseResult<T> = Promise<BaseResult<T>> & {
	on_success: (cb: (data: T) => void) => Promise<BaseResult<T>>
}
type Result<T> = BaseResult<T> & {
	on_success: (cb: (data: T) => void) => BaseResult<T>
}

// Shows a popup message on error
export function call_async<T>(cb: (addon: typeof window.addon) => T): PromiseResult<T> {
	const promise = (async () => {
		try {
			const data = await cb(window.addon)

			const result = { data, error: null }
			return result
		} catch (raw_err) {
			let error: Error
			if (raw_err instanceof Error) {
				error = raw_err
			} else {
				error = new Error('Unexpected error: ' + String(raw_err))
			}
			error_popup(error)

			const result = { data: null, error }
			return result
		}
	})() as PromiseResult<T>
	promise.on_success = async (cb) => {
		const result = await promise
		if (result.data) {
			cb(result.data)
		}
		return result
	}
	return promise
}

// Shows a popup message on error
export function call_sync<T>(cb: (addon: typeof window.addon) => T): Result<T> {
	const result = (() => {
		try {
			const data = cb(window.addon)

			const result = { data, error: null }
			return result
		} catch (raw_err) {
			let error: Error
			if (raw_err instanceof Error) {
				error = raw_err
			} else {
				error = new Error('Unexpected error: ' + String(raw_err))
			}
			error_popup(error)

			const result = { data: null, error }
			return result
		}
	})() as Result<T>
	result.on_success = (cb) => {
		if (result.data) {
			cb(result.data)
		}
		return result
	}
	return result
}
