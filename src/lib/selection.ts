import { writable } from 'svelte/store'

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
function add(selection: Selection, index: number) {
  if (selection.list[index] !== true) {
    selection.list[index] = true
    selection.count++
  }
  selection.lastAdded = index
}
function addRange(selection: Selection, from: number, to: number) {
  if (from < to) {
    for (let i = from; i <= to; i++) {
      add(selection, i)
    }
  } else {
    for (let i = from; i >= to; i--) {
      add(selection, i)
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

/** Get first selected index */
function findFirst(list: boolean[]) {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === true) return i
  }
  return null
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

export function newSelection() {
  const store = writable(createEmpty())

  return {
    subscribe: store.subscribe,
    findFirst: findFirst,
    getSelectedIndexes(selection: Selection): number[] {
      const indexes = []
      for (let i = 0; i < selection.list.length; i++) {
        if (selection.list[i]) {
          indexes.push(i)
        }
      }
      return indexes
    },
    /**
     * Add an index to the selection.
     */
    add(fromIndex: number, toIndex?: number) {
      store.update((selection) => {
        if (toIndex === undefined) {
          add(selection, fromIndex)
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
          add(selection, maxIndex)
        } else if (selection.lastAdded !== null) {
          const newIndex = selection.lastAdded - 1
          selection = createEmpty()
          add(selection, Math.max(0, newIndex))
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
          add(selection, 0)
        } else if (selection.lastAdded !== null) {
          const newIndex = selection.lastAdded + 1
          selection = createEmpty()
          add(selection, Math.min(newIndex, maxIndex))
        }
        return selection
      })
    },
    /**
     * Expand or shrink selection backwards (shift+up).
     */
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
              add(selection, i)
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
              add(selection, i)
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
          add(selection, index)
        }
        selection.shiftAnchor = null
        return selection
      })
    },
    clear() {
      store.set(createEmpty())
    },
  }
}
