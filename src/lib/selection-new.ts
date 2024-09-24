import { writable, type Updater, type Writable } from 'svelte/store'
import { check_mouse_shortcut, check_shortcut } from './helpers'

type SelectionOptions<T> = {
	scroll_to_item: (index: number) => void
	on_contextmenu: (items: Set<T>) => void
}

class Selection<T> {
	/** Currently selected items. Disallowing assignment
	 * prevents the Svelte store from getting out of sync */
	readonly items = new Set<T>()
	/** Full list of items that can be selected */
	all: T[]
	/** The last added index */
	last_added: { index: number; item: T } | null = null
	/** An anchor index for shift selection. */
	shift_anchor: { index: number; item: T } | null = null
	/** Whether the user is current mouseup is a click or a selection update */
	possible_row_click = false

	scroll_to_item: SelectionOptions<T>['scroll_to_item']
	on_contextmenu: SelectionOptions<T>['on_contextmenu']

	constructor(all_items: T[], options: SelectionOptions<T>) {
		this.all = all_items
		this.scroll_to_item = options.scroll_to_item
		this.on_contextmenu = options.on_contextmenu
	}

	clear() {
		this.items.clear()
		this.last_added = null
		this.shift_anchor = null
	}

	/** Update the list of items that can be selected.
	 * Items that no longer exist are de-selected. */
	update_all_items(all: T[]) {
		this.all = all
		const keep = new Set(all.filter((item) => this.items.has(item)))
		for (const item of this.items) {
			if (!keep.has(item)) {
				this.items.delete(item)
			}
		}
		if (this.last_added !== null && !this.items.has(this.last_added.item)) {
			this.last_added = null
		}
		if (this.shift_anchor !== null && !this.items.has(this.shift_anchor.item)) {
			this.shift_anchor = null
		}
	}

	#get_shift_anchor() {
		if (this.shift_anchor !== null) return this.shift_anchor
		else return this.last_added
	}

	add_index(index: number) {
		this.items.add(this.all[index])
		this.last_added = { index, item: this.all[index] }
		this.shift_anchor = null
	}

	#add_index_in_shift_mode(index: number) {
		this.items.add(this.all[index])
		this.last_added = { index, item: this.all[index] }
	}

	#add_index_range_in_shift_mode(from_index: number, to_index: number) {
		// Direction here determines this.last_added
		if (from_index < to_index) {
			for (let i = from_index; i <= to_index; i++) {
				this.#add_index_in_shift_mode(i)
			}
		} else {
			for (let i = from_index; i >= to_index; i--) {
				this.#add_index_in_shift_mode(i)
			}
		}
	}

	#remove_range_in_shift_mode(from_i: number, to_i: number) {
		if (from_i < to_i) {
			for (let i = from_i; i <= to_i; i++) {
				this.items.delete(this.all[i])
			}
		} else {
			for (let i = from_i; i >= to_i; i--) {
				this.items.delete(this.all[i])
			}
		}
	}

	/** Shift-select to index */
	shift_select_to(to_index: number) {
		const anchor = this.#get_shift_anchor()
		const last_added = this.last_added
		if (last_added === null || anchor === null) {
			return this.items
		}

		if (anchor.index < to_index) {
			if (to_index < last_added.index) {
				// Retract selection closer to anchor
				this.#remove_range_in_shift_mode(to_index + 1, last_added.index)
			} else if (last_added.index < anchor.index) {
				// New shift selection is on the other side of anchor
				this.#remove_range_in_shift_mode(anchor.index - 1, last_added.index)
				this.#add_index_range_in_shift_mode(anchor.index, to_index)
			} else {
				this.#add_index_range_in_shift_mode(last_added.index, to_index)
			}
			this.last_added = { index: to_index, item: this.all[to_index] }
		} else {
			if (to_index > last_added.index) {
				// Retract selection closer to anchor
				this.#remove_range_in_shift_mode(to_index - 1, last_added.index)
			} else if (last_added.index > anchor.index) {
				// New shift selection is on the other side of anchor
				this.#remove_range_in_shift_mode(anchor.index + 1, last_added.index)
				this.#add_index_range_in_shift_mode(anchor.index, to_index)
			} else {
				this.#add_index_range_in_shift_mode(last_added.index, to_index)
			}
			this.last_added = { index: to_index, item: this.all[to_index] }
		}
		this.shift_anchor = anchor
	}

	/** Get first selected index, or `null` if selection is empty */
	find_first_index() {
		const item_i = this.all.findIndex((item) => this.items.has(item))
		if (item_i === -1) {
			return null
		}
		return item_i
	}

	/** Get first selected item, or `undefined` if selection is empty */
	find_first() {
		const item_i = this.all.find((item) => this.items.has(item))
		return item_i
	}

	/** Replace selection with the previous index, like perssing `ArrowUp` in a list. */
	go_backward() {
		if (this.items.size === 0) {
			this.add_index(this.all.length - 1)
		} else if (this.last_added !== null) {
			const prev_index = this.last_added.index - 1
			this.clear()
			this.add_index(Math.max(prev_index, 0))
		}
	}

	/** Replace selection with the previous index, like perssing `ArrowDown` in a list. */
	go_forward() {
		if (this.items.size === 0) {
			this.add_index(0)
		} else if (this.last_added !== null) {
			const next_index = this.last_added.index + 1
			this.clear()
			this.add_index(Math.min(next_index, this.all.length - 1))
		}
	}
	/** Expand or shrink selection backwards (shift+up) */
	shift_select_backward() {
		const anchor = this.#get_shift_anchor()
		this.shift_anchor = anchor
		if (anchor === null || this.last_added === null) {
			return
		}
		if (this.last_added.index <= anchor.index) {
			// add prev to selection
			for (let i = this.last_added.index; i >= 0; i--) {
				if (!this.items.has(this.all[i])) {
					this.#add_index_in_shift_mode(i)
					return
				}
			}
		} else {
			// remove first from selection
			this.items.delete(this.last_added.item)
			this.last_added = {
				index: this.last_added.index - 1,
				item: this.all[this.last_added.index - 1],
			}
		}
	}
	/** Expand or shrink selection forwards (shift+down) */
	shift_select_forward() {
		const anchor = this.#get_shift_anchor()
		this.shift_anchor = anchor
		if (anchor === null || this.last_added === null) {
			return
		}
		if (this.last_added.index >= anchor.index) {
			// add next to selection
			for (let i = this.last_added.index; i < this.all.length; i++) {
				if (!this.items.has(this.all[i])) {
					this.#add_index_in_shift_mode(i)
					return
				}
			}
		} else {
			// remove last from selection
			this.items.delete(this.last_added.item)
			this.last_added = {
				index: this.last_added.index + 1,
				item: this.all[this.last_added.index + 1],
			}
		}
	}
	#toggle(index: number) {
		if (this.items.has(this.all[index])) {
			if (this.last_added && this.last_added.item === this.all[index]) {
				this.last_added = null
			}
			this.items.delete(this.all[index])
		} else {
			this.add_index(index)
		}
		this.shift_anchor = null
	}

	mouse_down_select(e: MouseEvent, index: number) {
		const is_selected = this.items.has(this.all[index])
		if (check_mouse_shortcut(e) && !is_selected) {
			this.clear()
			this.add_index(index)
		} else if (check_mouse_shortcut(e, { cmd_or_ctrl: true }) && !is_selected) {
			this.add_index(index)
		} else if (check_mouse_shortcut(e, { shift: true })) {
			this.shift_select_to(index)
		}
	}

	handle_mouse_down(e: MouseEvent, index: number) {
		if (e.button !== 0) {
			return
		}
		if (this.items.has(this.all[index])) {
			this.possible_row_click = true
		}
		this.mouse_down_select(e, index)
	}
	handle_contextmenu(e: MouseEvent, index: number) {
		this.mouse_down_select(e, index)
		this.on_contextmenu(this.items)
	}
	handle_click(e: MouseEvent, index: number) {
		if (this.possible_row_click && e.button === 0) {
			if (check_mouse_shortcut(e)) {
				this.clear()
				this.add_index(index)
			} else if (check_mouse_shortcut(e, { cmd_or_ctrl: true })) {
				this.#toggle(index)
			}
		}
		this.possible_row_click = false
	}
	handle_keydown(e: KeyboardEvent) {
		if (check_shortcut(e, 'Escape')) {
			this.clear()
		} else if (check_shortcut(e, 'A', { cmd_or_ctrl: true })) {
			this.#add_index_range_in_shift_mode(0, this.all.length - 1)
		} else if (check_shortcut(e, 'ArrowUp')) {
			this.go_backward()
			this.scroll_to_item(this.last_added?.index || 0)
		} else if (check_shortcut(e, 'ArrowUp', { shift: true })) {
			this.shift_select_backward()
			this.scroll_to_item(this.last_added?.index || 0)
		} else if (check_shortcut(e, 'ArrowUp', { alt: true })) {
			this.clear()
			this.add_index(0)
			this.scroll_to_item(0)
		} else if (check_shortcut(e, 'ArrowUp', { shift: true, alt: true })) {
			this.shift_select_to(0)
			this.scroll_to_item(this.last_added?.index || 0)
		} else if (check_shortcut(e, 'ArrowDown')) {
			this.go_forward()
			this.scroll_to_item(this.last_added?.index || 0)
		} else if (check_shortcut(e, 'ArrowDown', { shift: true })) {
			this.shift_select_forward()
			this.scroll_to_item(this.last_added?.index || 0)
		} else if (check_shortcut(e, 'ArrowDown', { alt: true })) {
			this.clear()
			this.add_index(this.all.length - 1)
			this.scroll_to_item(this.last_added?.index || 0)
		} else if (check_shortcut(e, 'ArrowDown', { shift: true, alt: true })) {
			this.shift_select_to(this.all.length - 1)
			this.scroll_to_item(this.last_added?.index || 0)
		} else {
			return
		}
		e.preventDefault()
	}
}

export class SvelteSelection<T> {
	readonly #selection: Selection<T>
	readonly #store: Writable<Set<T>>
	readonly subscribe: Writable<Set<T>>['subscribe']
	readonly items: Set<T>
	constructor(all_items: T[], options: SelectionOptions<T>) {
		this.#selection = new Selection(all_items, options)
		this.#store = writable(this.#selection.items)
		this.subscribe = this.#store.subscribe
		this.items = this.#selection.items
	}

	find_first_index() {
		return this.#selection.find_first_index()
	}

	find_first() {
		return this.#selection.find_first()
	}

	clear() {
		this.#selection.clear()
		this.#store.set(this.#selection.items)
	}

	update_all_items(all: T[]) {
		this.#selection.update_all_items(all)
		this.#store.set(this.#selection.items)
	}

	shift_select_to(to_index: number) {
		this.#selection.shift_select_to(to_index)
		this.#store.set(this.#selection.items)
	}

	mouse_down_select(e: MouseEvent, index: number) {
		this.#selection.mouse_down_select(e, index)
		this.#store.set(this.#selection.items)
	}
	handle_mouse_down(e: MouseEvent, index: number) {
		this.#selection.handle_mouse_down(e, index)
		this.#store.set(this.#selection.items)
	}
	handle_contextmenu(e: MouseEvent, index: number) {
		this.#selection.handle_contextmenu(e, index)
		this.#store.set(this.#selection.items)
	}
	handle_click(e: MouseEvent, index: number) {
		this.#selection.handle_click(e, index)
		this.#store.set(this.#selection.items)
	}
	handle_keydown(e: KeyboardEvent) {
		this.#selection.handle_keydown(e)
		this.#store.set(this.#selection.items)
	}
}
