import { writable } from 'svelte/store'

export function newSelection() {
  type Selection = {
    list: boolean[]
    count: number
    lastAdded: number | null
  }
  const store = writable(<Selection>{ list: [], count: 0, lastAdded: null })
  function add(selection: Selection, index: number) {
    selection.list[index] = true
    selection.lastAdded = index
    selection.count++
  }
  function remove(selection: Selection, index: number) {
    selection.list[index] = false
    selection.lastAdded = findFirst(selection.list)
    selection.count--
  }
  function findFirst(list: boolean[]) {
    for (let i = 0; i < list.length; i++) {
      if (list[i] === true) return i
    }
    return null
  }
  return {
    subscribe: store.subscribe,
    findFirst: findFirst,
    add(index: number) {
      store.update((selection) => {
        add(selection, index)
        return selection
      })
    },
    selectTo(toIndex: number) {
      store.update((selection) => {
        if (selection.lastAdded !== null) {
          const from = Math.min(toIndex, selection.lastAdded)
          const to = Math.max(toIndex, selection.lastAdded)
          for (let i = from; i < to + 1; i++) {
            add(selection, i)
          }
        } else {
          add(selection, toIndex)
        }
        return selection
      })
    },
    toggle(index: number) {
      store.update((selection) => {
        if (selection.list[index]) {
          remove(selection, index)
        } else {
          add(selection, index)
        }
        return selection
      })
    },
    clear() {
      store.set({ list: [], count: 0, lastAdded: null })
    },
  }
}
