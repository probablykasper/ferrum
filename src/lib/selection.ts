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
}
function createEmpty() {
  return <Selection>{
    list: [],
    count: 0,
    lastAdded: null,
    shiftAnchor: null,
  }
}
function addIndex(selection: Selection, index: number) {
  if (selection.list[index] !== true) {
    selection.list[index] = true
    selection.count++
  }
  selection.lastAdded = index
}
function addRange(selection: Selection, from: number, to: number) {
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
}
export function newSelection(options: SelectOptions) {
  const store = getterWritable(createEmpty())
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
      for (let i = 0; i < selection.list.length; i++) {
        if (selection.list[i] === true) return i
      }
      return null
    },
    getSelectedIndexes(): number[] {
      const selection = store.get()
      const indexes = []
      for (let i = 0; i < selection.list.length; i++) {
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
          selection = createEmpty()
          addIndex(selection, Math.max(0, newIndex))
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
          addIndex(selection, 0)
        } else if (selection.lastAdded !== null) {
          const newIndex = selection.lastAdded + 1
          selection = createEmpty()
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
          for (let i = selection.lastAdded; i >= 0; i--) {
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
      store.set(createEmpty())
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
      if (checkShortcut(e, 'Escape')) {
        selection.clear()
      } else if (checkShortcut(e, 'A', { cmdOrCtrl: true })) {
        selection.add(0, options.getItemCount() - 1)
      } else if (checkShortcut(e, 'ArrowUp')) {
        selection.goBackward(options.getItemCount() - 1)
        options.scrollToItem(store.get().lastAdded || 0)
      } else if (checkShortcut(e, 'ArrowUp', { shift: true })) {
        selection.shiftSelectBackward()
        options.scrollToItem(store.get().lastAdded || 0)
      } else if (checkShortcut(e, 'ArrowUp', { alt: true })) {
        selection.clear()
        selection.add(0)
        options.scrollToItem(0)
      } else if (checkShortcut(e, 'ArrowUp', { shift: true, alt: true })) {
        selection.shiftSelectTo(0)
        options.scrollToItem(store.get().lastAdded || 0)
      } else if (checkShortcut(e, 'ArrowDown')) {
        selection.goForward(options.getItemCount() - 1)
        options.scrollToItem(store.get().lastAdded || 0)
      } else if (checkShortcut(e, 'ArrowDown', { shift: true })) {
        selection.shiftSelectForward(options.getItemCount() - 1)
        options.scrollToItem(store.get().lastAdded || 0)
      } else if (checkShortcut(e, 'ArrowDown', { alt: true })) {
        selection.clear()
        selection.add(options.getItemCount() - 1)
        options.scrollToItem(store.get().lastAdded || 0)
      } else if (checkShortcut(e, 'ArrowDown', { shift: true, alt: true })) {
        selection.shiftSelectTo(options.getItemCount() - 1)
        options.scrollToItem(store.get().lastAdded || 0)
      } else {
        return
      }
      e.preventDefault()
    },
  }
  return selection
}
