import { check_mouse_shortcut, check_shortcut, getter_writable } from './helpers'

/**
 * The selection object.
 * - `list`: The array of indexes, where an index is `true` if it's selected
 * - `count`: The amount of selected items
 * - `lastAdded`: The last added index
 * - `shiftAnchor`: An anchor index for shift selection.
 */
type Selection = {
	list: boolean[]
	count: number
	lastAdded: number | null
	shiftAnchor: number | null
	minimumIndex: number
}
function clear(selection: Selection) {
	selection.list = []
	selection.count = 0
	selection.lastAdded = null
	selection.shiftAnchor = null
}
function add_index(selection: Selection, index: number) {
	if (index < selection.minimumIndex) {
		return
	}
	if (selection.list[index] !== true) {
		selection.list[index] = true
		selection.count++
	}
	selection.lastAdded = index
}
function add_range(selection: Selection, from: number, to: number) {
	if (from < selection.minimumIndex) {
		if (to < selection.minimumIndex) {
			return
		}
		from = selection.minimumIndex
	}
	if (to < selection.minimumIndex) {
		to = selection.minimumIndex
	}
	if (from < to) {
		for (let i = from; i <= to; i++) {
			add_index(selection, i)
		}
	} else {
		for (let i = from; i >= to; i--) {
			add_index(selection, i)
		}
	}
}

function remove(selection: Selection, index: number) {
	selection.list[index] = false
	selection.count--
}
function remove_range(selection: Selection, from: number, to: number) {
	if (from < to) {
		for (let i = from; i <= to; i++) {
			remove(selection, i)
		}
	} else {
		for (let i = from; i >= to; i--) {
			remove(selection, i)
		}
	}
}

function get_shift_anchor(selection: Selection) {
	if (selection.shiftAnchor !== null) return selection.shiftAnchor
	else return selection.lastAdded
}

function select_to(selection: Selection, to_index: number) {
	const anchor = get_shift_anchor(selection)
	const last_added = selection.lastAdded
	if (last_added === null || anchor === null) {
		return selection
	}
	if (anchor < to_index) {
		if (to_index < last_added) {
			// new shift selection is closer to anchor
			remove_range(selection, to_index + 1, last_added)
		} else if (last_added < anchor) {
			// new shift selection is on the other side of anchor
			remove_range(selection, anchor - 1, last_added)
			add_range(selection, anchor, to_index)
		} else {
			add_range(selection, last_added, to_index)
		}
		selection.lastAdded = to_index
	} else {
		if (to_index > last_added) {
			// new shift selection is closer to anchor
			remove_range(selection, to_index - 1, last_added)
		} else if (last_added > anchor) {
			// new shift selection is on the other side of anchor
			remove_range(selection, anchor + 1, last_added)
			add_range(selection, anchor, to_index)
		} else {
			add_range(selection, last_added, to_index)
		}
		selection.lastAdded = to_index
	}
	selection.shiftAnchor = anchor
}

type SelectOptions = {
	get_item_count: () => number
	scroll_to_item: (index: number) => void
	on_context_menu: () => void
	minimum_index?: number
}
export function new_selection(options: SelectOptions) {
	const store = getter_writable<Selection>({
		list: [],
		count: 0,
		lastAdded: null,
		shiftAnchor: null,
		minimumIndex: options.minimum_index || 0,
	})
	let possible_row_click = false

	function mouse_down_select(e: MouseEvent, index: number) {
		const is_selected = store.get().list[index]
		if (check_mouse_shortcut(e) && !is_selected) {
			selection.clear()
			selection.add(index)
		} else if (check_mouse_shortcut(e, { cmd_or_ctrl: true }) && !is_selected) {
			selection.add(index)
		} else if (check_mouse_shortcut(e, { shift: true })) {
			selection.shiftSelectTo(index)
		}
	}

	const selection = {
		subscribe: store.subscribe,
		/** Get first selected index */
		findFirst() {
			const selection = store.get()
			for (let i = selection.minimumIndex; i < selection.list.length; i++) {
				if (selection.list[i] === true) return i
			}
			return null
		},
		/* Indexes lower than this cannot be selected */
		setMinimumIndex(index: number) {
			store.update((selection) => {
				selection.minimumIndex = index
				if (index > 0) {
					remove_range(selection, 0, index - 1)
				}
				return selection
			})
		},
		getSelectedIndexes(): number[] {
			const selection = store.get()
			const indexes = []
			for (let i = selection.minimumIndex; i < selection.list.length; i++) {
				if (selection.list[i]) {
					indexes.push(i)
				}
			}
			return indexes
		},
		/** Add an index to the selection */
		add(from_index: number, to_index?: number) {
			store.update((selection) => {
				if (to_index === undefined) {
					add_index(selection, from_index)
				} else {
					add_range(selection, from_index, to_index)
				}
				selection.shiftAnchor = null
				return selection
			})
		},
		/**
		 * Replace selection with the previous index.
		 * - `maxIndex`: The max index that can be selected.
		 */
		goBackward(max_index: number) {
			store.update((selection) => {
				if (selection.count === 0) {
					add_index(selection, max_index)
				} else if (selection.lastAdded !== null) {
					const new_index = selection.lastAdded - 1
					clear(selection)
					add_index(selection, Math.max(selection.minimumIndex, new_index))
				}
				return selection
			})
		},
		/**
		 * Replace selection with the next index.
		 * - `maxIndex`: The max index that can be selected.
		 */
		goForward(max_index: number) {
			store.update((selection) => {
				if (selection.count === 0) {
					add_index(selection, selection.minimumIndex)
				} else if (selection.lastAdded !== null) {
					const new_index = selection.lastAdded + 1
					clear(selection)
					add_index(selection, Math.min(new_index, max_index))
				}
				return selection
			})
		},
		/** Expand or shrink selection backwards (shift+up) */
		shiftSelectBackward() {
			store.update((selection) => {
				const anchor = get_shift_anchor(selection)
				selection.shiftAnchor = anchor
				if (anchor === null || selection.lastAdded === null) {
					return selection
				}
				if (selection.lastAdded <= anchor) {
					// add prev to selection
					for (let i = selection.lastAdded; i >= selection.minimumIndex; i--) {
						if (selection.list[i] !== true) {
							add_index(selection, i)
							return selection
						}
					}
				} else {
					// remove first from selection
					remove(selection, selection.lastAdded)
					selection.lastAdded -= 1
				}
				return selection
			})
		},
		/**
		 * Expand or shrink selection forwards (shift+down).
		 * - `maxIndex`: The maximum index to expand to
		 */
		shiftSelectForward(max_index: number) {
			store.update((selection) => {
				const anchor = get_shift_anchor(selection)
				selection.shiftAnchor = anchor
				if (anchor === null || selection.lastAdded === null) {
					return selection
				}
				if (selection.lastAdded >= anchor) {
					// add next to selection
					for (let i = selection.lastAdded; i <= max_index; i++) {
						if (selection.list[i] !== true) {
							add_index(selection, i)
							return selection
						}
					}
				} else {
					// remove last from selection
					remove(selection, selection.lastAdded)
					selection.lastAdded += 1
				}
				return selection
			})
		},
		/**
		 * Expand selection to index (shift+click selection).
		 * Selects in either upwards or downwards order.
		 * Selects only `toIndex` if there's no existing selection.
		 */
		shiftSelectTo(to_index: number) {
			store.update((selection) => {
				select_to(selection, to_index)
				return selection
			})
		},
		toggle(index: number) {
			store.update((selection) => {
				if (selection.list[index]) {
					if (selection.lastAdded === index) {
						selection.lastAdded = null
					}
					remove(selection, index)
				} else {
					add_index(selection, index)
				}
				selection.shiftAnchor = null
				return selection
			})
		},
		clear() {
			store.update((selection) => {
				clear(selection)
				return selection
			})
		},

		handleMouseDown(e: MouseEvent, index: number) {
			if (e.button !== 0) {
				return
			}
			if (store.get().list[index]) {
				possible_row_click = true
			}
			mouse_down_select(e, index)
		},
		handleContextMenu(e: MouseEvent, index: number) {
			mouse_down_select(e, index)
			options.on_context_menu()
		},
		handleClick(e: MouseEvent, index: number) {
			if (possible_row_click && e.button === 0) {
				if (check_mouse_shortcut(e)) {
					selection.clear()
					selection.add(index)
				} else if (check_mouse_shortcut(e, { cmd_or_ctrl: true })) {
					selection.toggle(index)
				}
			}
			possible_row_click = false
		},
		handleKeyDown(e: KeyboardEvent) {
			const item_count = options.get_item_count()
			const { minimumIndex } = store.get()
			if (item_count === 0 || item_count < minimumIndex) {
				return
			}
			if (check_shortcut(e, 'Escape')) {
				selection.clear()
			} else if (check_shortcut(e, 'A', { cmd_or_ctrl: true })) {
				selection.add(minimumIndex, item_count - 1)
			} else if (check_shortcut(e, 'ArrowUp')) {
				selection.goBackward(item_count - 1)
				options.scroll_to_item(store.get().lastAdded || minimumIndex)
			} else if (check_shortcut(e, 'ArrowUp', { shift: true })) {
				selection.shiftSelectBackward()
				options.scroll_to_item(store.get().lastAdded || minimumIndex)
			} else if (check_shortcut(e, 'ArrowUp', { alt: true })) {
				selection.clear()
				selection.add(minimumIndex)
				options.scroll_to_item(minimumIndex)
			} else if (check_shortcut(e, 'ArrowUp', { shift: true, alt: true })) {
				selection.shiftSelectTo(minimumIndex)
				options.scroll_to_item(store.get().lastAdded || minimumIndex)
			} else if (check_shortcut(e, 'ArrowDown')) {
				selection.goForward(item_count - 1)
				options.scroll_to_item(store.get().lastAdded || minimumIndex)
			} else if (check_shortcut(e, 'ArrowDown', { shift: true })) {
				selection.shiftSelectForward(item_count - 1)
				options.scroll_to_item(store.get().lastAdded || minimumIndex)
			} else if (check_shortcut(e, 'ArrowDown', { alt: true })) {
				selection.clear()
				selection.add(item_count - 1)
				options.scroll_to_item(store.get().lastAdded || minimumIndex)
			} else if (check_shortcut(e, 'ArrowDown', { shift: true, alt: true })) {
				selection.shiftSelectTo(item_count - 1)
				options.scroll_to_item(store.get().lastAdded || minimumIndex)
			} else {
				return
			}
			e.preventDefault()
		},
	}
	return selection
}
