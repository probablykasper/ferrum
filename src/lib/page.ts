export const tracklist_actions = {
	scroll_to_index(_index: number) {},
	focus() {
		const el = document.querySelector('.main-focus-element')
		if (el instanceof HTMLElement) el.focus()
	},
}
