import { writable } from 'svelte/store'

export const url_pathname = writable(window.location.pathname)

export function navigate(to_pathname: string, options: { replace?: boolean } = {}) {
	if (to_pathname !== window.location.pathname + window.location.search) {
		if (options.replace) {
			window.history.replaceState({}, '', to_pathname)
		} else {
			window.history.pushState({}, '', to_pathname)
		}
		url_pathname.set(to_pathname)
	}
}

window.addEventListener('click', (e) => {
	let node = e.target
	while (node) {
		if ((node as HTMLAnchorElement).nodeName === 'A') {
			const new_url = new URL((node as HTMLAnchorElement).href)
			if (new_url.origin === window.location.origin) {
				e.preventDefault()
			}
		}
		node = (node as Node).parentNode
	}
})

export function navigate_back() {
	window.history.back()
}

export function navigate_forward() {
	window.history.forward()
}
window.addEventListener('popstate', () => {
	url_pathname.set(window.location.pathname)
})
