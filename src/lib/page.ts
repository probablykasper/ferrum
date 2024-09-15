import { get } from 'svelte/store'
import { page } from './data'
import { show_track_menu } from './menus'
import { new_selection } from './selection'

export const tracklist_actions = {
	scroll_to_index(_index: number) {},
	focus() {},
}
export const selection = new_selection({
	get_item_count() {
		return get(page).length
	},
	// scrollToItem: scroll_to_index,
	scroll_to_item(i) {
		tracklist_actions.scroll_to_index?.(i)
	},
	async on_context_menu() {
		const indexes = selection.getSelectedIndexes()
		const ids = page.get_track_ids()
		await show_track_menu(ids, indexes, { editable: get(page).tracklist.type === 'playlist' })
	},
})
