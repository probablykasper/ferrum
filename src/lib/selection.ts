import { checkMouseShortcut, checkShortcut, getterWritable } from './helpers'

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
function addIndex(selection: Selection, index: number) {
	if (index < selection.minimumIndex) {
		return
	}
	if (selection.list[index] !== true) {
		selection.list[index] = true
		selection.count++
	}
	selection.lastAdded = index
}
function addRange(selection: Selection, from: number, to: number) {
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
			addIndex(selection, i)
		}
	} else {
		for (let i = from; i >= to; i--) {
			addIndex(selection, i)
		}
	}
}

function remove(selection: Selection, index: number) {
	selection.list[index] = false
	selection.count--
}
function removeRange(selection: Selection, from: number, to: number) {
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

function getShiftAnchor(selection: Selection) {
	if (selection.shiftAnchor !== null) return selection.shiftAnchor
	else return selection.lastAdded
}

function selectTo(selection: Selection, toIndex: number) {
	const anchor = getShiftAnchor(selection)
	const lastAdded = selection.lastAdded
	if (lastAdded === null || anchor === null) {
		return selection
	}
	if (anchor < toIndex) {
		if (toIndex < lastAdded) {
			// new shift selection is closer to anchor
			removeRange(selection, toIndex + 1, lastAdded)
		} else if (lastAdded < anchor) {
			// new shift selection is on the other side of anchor
			removeRange(selection, anchor - 1, lastAdded)
			addRange(selection, anchor, toIndex)
		} else {
			addRange(selection, lastAdded, toIndex)
		}
		selection.lastAdded = toIndex
	} else {
		if (toIndex > lastAdded) {
			// new shift selection is closer to anchor
			removeRange(selection, toIndex - 1, lastAdded)
		} else if (lastAdded > anchor) {
			// new shift selection is on the other side of anchor
			removeRange(selection, anchor + 1, lastAdded)
			addRange(selection, anchor, toIndex)
		} else {
			addRange(selection, lastAdded, toIndex)
		}
		selection.lastAdded = toIndex
	}
	selection.shiftAnchor = anchor
}

type SelectOptions = {
	getItemCount: () => number
	scrollToItem: (index: number) => void
	onContextMenu: () => void
	minimumIndex?: number
}
export function newSelection(options: SelectOptions) {
	const store = getterWritable<Selection>({
		list: [],
		count: 0,
		lastAdded: null,
		shiftAnchor: null,
		minimumIndex: options.minimumIndex || 0,
	})
	let possibleRowClick = false

	function mouseDownSelect(e: MouseEvent, index: number) {
		const isSelected = store.get().list[index]
		if (checkMouseShortcut(e) && !isSelected) {
			selection.clear()
			selection.add(index)
		} else if (checkMouseShortcut(e, { cmdOrCtrl: true }) && !isSelected) {
			selection.add(index)
		} else if (checkMouseShortcut(e, { shift: true })) {
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
					removeRange(selection, 0, index - 1)
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
		add(fromIndex: number, toIndex?: number) {
			store.update((selection) => {
				if (toIndex === undefined) {
					addIndex(selection, fromIndex)
				} else {
					addRange(selection, fromIndex, toIndex)
				}
				selection.shiftAnchor = null
				return selection
			})
		},
		/**
		 * Replace selection with the previous index.
		 * - `maxIndex`: The max index that can be selected.
		 */
		goBackward(maxIndex: number) {
			store.update((selection) => {
				if (selection.count === 0) {
					addIndex(selection, maxIndex)
				} else if (selection.lastAdded !== null) {
					const newIndex = selection.lastAdded - 1
					clear(selection)
					addIndex(selection, Math.max(selection.minimumIndex, newIndex))
				}
				return selection
			})
		},
		/**
		 * Replace selection with the next index.
		 * - `maxIndex`: The max index that can be selected.
		 */
		goForward(maxIndex: number) {
			store.update((selection) => {
				if (selection.count === 0) {
					addIndex(selection, selection.minimumIndex)
				} else if (selection.lastAdded !== null) {
					const newIndex = selection.lastAdded + 1
					clear(selection)
					addIndex(selection, Math.min(newIndex, maxIndex))
				}
				return selection
			})
		},
		/** Expand or shrink selection backwards (shift+up) */
		shiftSelectBackward() {
			store.update((selection) => {
				const anchor = getShiftAnchor(selection)
				selection.shiftAnchor = anchor
				if (anchor === null || selection.lastAdded === null) {
					return selection
				}
				if (selection.lastAdded <= anchor) {
					// add prev to selection
					for (let i = selection.lastAdded; i >= selection.minimumIndex; i--) {
						if (selection.list[i] !== true) {
							addIndex(selection, i)
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
		shiftSelectForward(maxIndex: number) {
			store.update((selection) => {
				const anchor = getShiftAnchor(selection)
				selection.shiftAnchor = anchor
				if (anchor === null || selection.lastAdded === null) {
					return selection
				}
				if (selection.lastAdded >= anchor) {
					// add next to selection
					for (let i = selection.lastAdded; i <= maxIndex; i++) {
						if (selection.list[i] !== true) {
							addIndex(selection, i)
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
		shiftSelectTo(toIndex: number) {
			store.update((selection) => {
				selectTo(selection, toIndex)
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
					addIndex(selection, index)
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
				possibleRowClick = true
			}
			mouseDownSelect(e, index)
		},
		handleContextMenu(e: MouseEvent, index: number) {
			mouseDownSelect(e, index)
			options.onContextMenu()
		},
		handleClick(e: MouseEvent, index: number) {
			if (possibleRowClick && e.button === 0) {
				if (checkMouseShortcut(e)) {
					selection.clear()
					selection.add(index)
				} else if (checkMouseShortcut(e, { cmdOrCtrl: true })) {
					selection.toggle(index)
				}
			}
			possibleRowClick = false
		},
		handleKeyDown(e: KeyboardEvent) {
			const itemCount = options.getItemCount()
			const { minimumIndex } = store.get()
			if (itemCount === 0 || itemCount < minimumIndex) {
				return
			}
			if (checkShortcut(e, 'Escape')) {
				selection.clear()
			} else if (checkShortcut(e, 'A', { cmdOrCtrl: true })) {
				selection.add(minimumIndex, itemCount - 1)
			} else if (checkShortcut(e, 'ArrowUp')) {
				selection.goBackward(itemCount - 1)
				options.scrollToItem(store.get().lastAdded || minimumIndex)
			} else if (checkShortcut(e, 'ArrowUp', { shift: true })) {
				selection.shiftSelectBackward()
				options.scrollToItem(store.get().lastAdded || minimumIndex)
			} else if (checkShortcut(e, 'ArrowUp', { alt: true })) {
				selection.clear()
				selection.add(minimumIndex)
				options.scrollToItem(minimumIndex)
			} else if (checkShortcut(e, 'ArrowUp', { shift: true, alt: true })) {
				selection.shiftSelectTo(minimumIndex)
				options.scrollToItem(store.get().lastAdded || minimumIndex)
			} else if (checkShortcut(e, 'ArrowDown')) {
				selection.goForward(itemCount - 1)
				options.scrollToItem(store.get().lastAdded || minimumIndex)
			} else if (checkShortcut(e, 'ArrowDown', { shift: true })) {
				selection.shiftSelectForward(itemCount - 1)
				options.scrollToItem(store.get().lastAdded || minimumIndex)
			} else if (checkShortcut(e, 'ArrowDown', { alt: true })) {
				selection.clear()
				selection.add(itemCount - 1)
				options.scrollToItem(store.get().lastAdded || minimumIndex)
			} else if (checkShortcut(e, 'ArrowDown', { shift: true, alt: true })) {
				selection.shiftSelectTo(itemCount - 1)
				options.scrollToItem(store.get().lastAdded || minimumIndex)
			} else {
				return
			}
			e.preventDefault()
		},
	}
	return selection
}
