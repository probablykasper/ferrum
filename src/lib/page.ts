import { get } from 'svelte/store'
import { page } from './data'
import { showTrackMenu } from './menus'
import { newSelection } from './selection'

export const tracklist_actions = {
	scroll_to_index(_index: number) {},
	focus() {},
}
export const selection = newSelection({
	getItemCount() {
		return get(page).length
	},
	// scrollToItem: scroll_to_index,
	scrollToItem(i) {
		tracklist_actions.scroll_to_index?.(i)
	},
	async onContextMenu() {
		const indexes = selection.getSelectedIndexes()
		const ids = page.getTrackIds()
		await showTrackMenu(ids, indexes, { editable: get(page).tracklist.type === 'playlist' })
	},
})
