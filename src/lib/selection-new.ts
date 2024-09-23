import { writable, type Updater } from 'svelte/store'

type SelectionOptions = {
	scroll_to_item: (index: number) => void
	on_context_menu: () => void
}

export class Selection<T> {
	/** Currently selected items */
	selection = new Set<T>()
	selection_store = writable(this.selection)
	subscribe = this.selection_store.subscribe
	/** Full list of items that can be selected */
	all: T[] = []
	/** The last added index */
	last_added: { index: number; item: T } | null = null
	/** An anchor index for shift selection. */
	shift_anchor: { index: number; item: T } | null = null
	scroll_to_item: SelectionOptions['scroll_to_item']
	on_context_menu: SelectionOptions['on_context_menu']

	constructor(options: SelectionOptions) {
		this.scroll_to_item = options.scroll_to_item
		this.on_context_menu = options.on_context_menu
	}

	set(new_selection: Set<T>) {
		this.selection = new_selection
		this.selection_store.set(new_selection)
	}

	update(updater: Updater<Set<T>>) {
		this.selection = updater(this.selection)
		this.selection_store.set(this.selection)
	}

	clear() {
		this.selection = new Set()
		this.last_added = null
		this.shift_anchor = null
	}

	/** Update the list of items that can be selected.
	 * Items that no longer exist are de-selected. */
	update_all_items(all: T[]) {
		let new_selection = new Set<T>()
		for (const item of all) {
			if (this.selection.has(item)) {
				new_selection.add(item)
			}
		}
		this.all = all
		this.selection = new_selection
		if (this.last_added !== null && !this.selection.has(this.last_added.item)) {
			this.last_added = null
		}
		if (this.shift_anchor !== null && !this.selection.has(this.shift_anchor.item)) {
			this.shift_anchor = null
		}
	}

	get_shift_anchor() {
		if (this.shift_anchor !== null) return this.shift_anchor
		else return this.last_added
	}

	add_index(index: number) {
		this.selection.add(this.all[index])
		this.last_added = { index, item: this.all[index] }
	}

	add_range(from_index: number, to_index: number) {
		// Direction here determines this.last_added
		if (from_index < to_index) {
			for (let i = from_index; i <= to_index; i++) {
				this.add_index(i)
			}
		} else {
			for (let i = from_index; i >= to_index; i--) {
				this.add_index(i)
			}
		}
	}

	remove_range(from_i: number, to_i: number) {
		if (from_i < to_i) {
			for (let i = from_i; i <= to_i; i++) {
				this.selection.delete(this.all[i])
			}
		} else {
			for (let i = from_i; i >= to_i; i--) {
				this.selection.delete(this.all[i])
			}
		}
	}

	/** Shift-select to index */
	shift_select_to(to_index: number) {
		const anchor = this.get_shift_anchor()
		const last_added = this.last_added
		if (last_added === null || anchor === null) {
			return this.selection
		}

		if (anchor.index < to_index) {
			if (to_index < last_added.index) {
				// Retract selection closer to anchor
				this.remove_range(to_index + 1, last_added.index)
			} else if (last_added.index < anchor.index) {
				// New shift selection is on the other side of anchor
				this.remove_range(anchor.index - 1, last_added.index)
				this.add_range(anchor.index, to_index)
			} else {
				this.add_range(last_added.index, to_index)
			}
			this.last_added = { index: to_index, item: this.all[to_index] }
		} else {
			if (to_index > last_added.index) {
				// Retract selection closer to anchor
				this.remove_range(to_index - 1, last_added.index)
			} else if (last_added.index > anchor.index) {
				// New shift selection is on the other side of anchor
				this.remove_range(anchor.index + 1, last_added.index)
				this.add_range(anchor.index, to_index)
			} else {
				this.add_range(last_added.index, to_index)
			}
			this.last_added = { index: to_index, item: this.all[to_index] }
		}
		this.shift_anchor = anchor
	}

	/** Get first selected index, or `null` if selection is empty */
	find_first_index() {
		const item_i = this.all.findIndex((item) => this.selection.has(item))
		if (item_i === -1) {
			return null
		}
		return item_i
	}

	/** Replace selection with the previous index, like perssing `ArrowUp` in a list. */
	go_backward() {
		// selection.clear()
		// store.update((selection) => {
		// 	if (selection.count === 0) {
		// 		addIndex(selection, maxIndex)
		// 	} else if (selection.lastAdded !== null) {
		// 		const newIndex = selection.lastAdded - 1
		// 		selection = createEmpty()
		// 		addIndex(selection, Math.max(0, newIndex))
		// 	}
		// 	return selection
		// })
	}

	/** Replace selection with the previous index, like perssing `ArrowDown` in a list. */
	go_forward() {
		// store.update((selection) => {
		// 	if (selection.count === 0) {
		// 		addIndex(selection, 0)
		// 	} else if (selection.lastAdded !== null) {
		// 		const newIndex = selection.lastAdded + 1
		// 		selection = createEmpty()
		// 		addIndex(selection, Math.min(newIndex, maxIndex))
		// 	}
		// 	return selection
		// })
	}
	/** Expand or shrink selection backwards (shift+up) */
	shift_select_backward() {
		// store.update((selection) => {
		// 	const anchor = getShiftAnchor(selection)
		// 	selection.shiftAnchor = anchor
		// 	if (anchor === null || selection.lastAdded === null) {
		// 		return selection
		// 	}
		// 	if (selection.lastAdded <= anchor) {
		// 		// add prev to selection
		// 		for (let i = selection.lastAdded; i >= 0; i--) {
		// 			if (selection.list[i] !== true) {
		// 				addIndex(selection, i)
		// 				return selection
		// 			}
		// 		}
		// 	} else {
		// 		// remove first from selection
		// 		remove(selection, selection.lastAdded)
		// 		selection.lastAdded -= 1
		// 	}
		// 	return selection
		// })
	}
	/**
	 * Expand or shrink selection forwards (shift+down).
	 * - `maxIndex`: The maximum index to expand to
	 */
	shift_select_forward(maxIndex: number) {
		// store.update((selection) => {
		// 	const anchor = getShiftAnchor(selection)
		// 	selection.shiftAnchor = anchor
		// 	if (anchor === null || selection.lastAdded === null) {
		// 		return selection
		// 	}
		// 	if (selection.lastAdded >= anchor) {
		// 		// add next to selection
		// 		for (let i = selection.lastAdded; i <= maxIndex; i++) {
		// 			if (selection.list[i] !== true) {
		// 				addIndex(selection, i)
		// 				return selection
		// 			}
		// 		}
		// 	} else {
		// 		// remove last from selection
		// 		remove(selection, selection.lastAdded)
		// 		selection.lastAdded += 1
		// 	}
		// 	return selection
		// })
	}
	toggle(index: number) {
		// store.update((selection) => {
		// 	if (selection.list[index]) {
		// 		if (selection.lastAdded === index) {
		// 			selection.lastAdded = null
		// 		}
		// 		remove(selection, index)
		// 	} else {
		// 		addIndex(selection, index)
		// 	}
		// 	selection.shiftAnchor = null
		// 	return selection
		// })
	}

	// mouse_down_select(e: MouseEvent, index: number) {
	// 	const isSelected = store.get().list[index]
	// 	if (check_mouse_shortcut(e) && !isSelected) {
	// 		selection.clear()
	// 		selection.add(index)
	// 	} else if (check_mouse_shortcut(e, { cmd_or_ctrl: true }) && !isSelected) {
	// 		selection.add(index)
	// 	} else if (check_mouse_shortcut(e, { shift: true })) {
	// 		selection.shift_select_to(index)
	// 	}
	// }

	handle_mouse_down(e: MouseEvent, index: number) {
		// if (e.button !== 0) {
		// 	return
		// }
		// if (store.get().list[index]) {
		// 	possible_row_click = true
		// }
		// mouse_down_select(e, index)
	}
	handle_contextmenu(e: MouseEvent, index: number) {
		// mouse_down_select(e, index)
		// options.on_context_menu()
	}
	handle_click(e: MouseEvent, index: number) {
		// if (possible_row_click && e.button === 0) {
		// 	if (check_mouse_shortcut(e)) {
		// 		selection.clear()
		// 		selection.add(index)
		// 	} else if (check_mouse_shortcut(e, { cmd_or_ctrl: true })) {
		// 		selection.toggle(index)
		// 	}
		// }
		// possible_row_click = false
	}
	handle_keydown(e: KeyboardEvent) {
		// if (check_shortcut(e, 'Escape')) {
		// 	selection.clear()
		// } else if (check_shortcut(e, 'A', { cmd_or_ctrl: true })) {
		// 	selection.add(0, options.getItemCount() - 1)
		// } else if (check_shortcut(e, 'ArrowUp')) {
		// 	selection.goBackward(options.getItemCount() - 1)
		// 	options.scroll_to_item(store.get().lastAdded || 0)
		// } else if (check_shortcut(e, 'ArrowUp', { shift: true })) {
		// 	selection.shiftSelectBackward()
		// 	options.scroll_to_item(store.get().lastAdded || 0)
		// } else if (check_shortcut(e, 'ArrowUp', { alt: true })) {
		// 	selection.clear()
		// 	selection.add(0)
		// 	options.scroll_to_item(0)
		// } else if (check_shortcut(e, 'ArrowUp', { shift: true, alt: true })) {
		// 	selection.shiftSelectTo(0)
		// 	options.scroll_to_item(store.get().lastAdded || 0)
		// } else if (check_shortcut(e, 'ArrowDown')) {
		// 	selection.goForward(options.getItemCount() - 1)
		// 	options.scroll_to_item(store.get().lastAdded || 0)
		// } else if (check_shortcut(e, 'ArrowDown', { shift: true })) {
		// 	selection.shiftSelectForward(options.getItemCount() - 1)
		// 	options.scroll_to_item(store.get().lastAdded || 0)
		// } else if (check_shortcut(e, 'ArrowDown', { alt: true })) {
		// 	selection.clear()
		// 	selection.add(options.getItemCount() - 1)
		// 	options.scroll_to_item(store.get().lastAdded || 0)
		// } else if (check_shortcut(e, 'ArrowDown', { shift: true, alt: true })) {
		// 	selection.shiftSelectTo(options.getItemCount() - 1)
		// 	options.scroll_to_item(store.get().lastAdded || 0)
		// } else {
		// 	return
		// }
		// e.preventDefault()
	}
}

export function new_selection(options: SelectionOptions) {
	return new Selection(options)
}
