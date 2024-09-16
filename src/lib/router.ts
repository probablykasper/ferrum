import { writable } from 'svelte/store'

export const url = writable(new URL(window.location.href))

export function navigate(to_url: string) {
	const new_url = new URL(to_url, window.location.href)
	if (new_url.href !== window.location.href) {
		window.history.pushState({}, '', new_url)
		url.set(new_url)
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
