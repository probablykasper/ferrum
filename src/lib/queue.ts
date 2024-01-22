/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { TrackID } from '../../ferrum-addon'
import { get, writable } from 'svelte/store'
import { methods } from './data'
import { getterWritable } from './helpers'
import { ipcRenderer } from './window'

export const queueVisible = writable(false)
export function toggleQueueVisibility() {
  queueVisible.update((v) => !v)
}

export type QueueItem = {
  qId: number
  id: TrackID
  nonShufflePos?: number
}
let lastQId = -1
function newQueueItem(id: TrackID): QueueItem {
  lastQId++
  return {
    qId: lastQId,
    id,
  }
}

/**
 * If `hasCurrent` is true, the current track is past[length-1]
 */
export type Queue = {
  past: QueueItem[]
  current: {
    item: QueueItem
    fromAutoQueue: boolean
  } | null
  userQueue: QueueItem[]
  autoQueue: QueueItem[]
}
export const queue = (() => {
  const store = getterWritable({
    past: [],
    userQueue: [],
    current: null,
    autoQueue: [],
  } as Queue)
  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,
    get: store.get,
    getCurrent,
    getQueueLength,
    getByQueueIndex,
    prependToUserQueue,
    appendToUserQueue,
    removeIndexes,
    removeDeleted,
  }
})()

/** Fisher-Yates shuffle */
function shuffleArray<T>(array: Array<T>) {
  let currentIndex = array.length,
    randomIndex

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }

  return array
}

export const shuffle = writable(false)
function applyShuffle(shuffle: boolean) {
  queue.update((q) => {
    if (shuffle) {
      for (let i = 0; i < q.autoQueue.length; i++) {
        q.autoQueue[i].nonShufflePos = i
      }
      q.autoQueue = shuffleArray(q.autoQueue)
      return q
    } else {
      const oldItems: Partial<QueueItem[]> = []
      const newItems: QueueItem[] = []
      for (const item of q.autoQueue) {
        if (item.nonShufflePos !== undefined) {
          oldItems[item.nonShufflePos] = item
        } else {
          newItems.push(item)
        }
      }
      const oldItemsClean = oldItems.filter((i) => i !== undefined) as QueueItem[]
      q.autoQueue = newItems.concat(oldItemsClean)
      return q
    }
  })
}
shuffle.subscribe(($shuffle) => {
  applyShuffle($shuffle)
  ipcRenderer.invoke('update:Shuffle', $shuffle)
})
ipcRenderer.on('Shuffle', () => {
  shuffle.update((value) => !value)
})

export const repeat = getterWritable(false)
ipcRenderer.on('Repeat', () => {
  repeat.update((value) => !value)
})
repeat.subscribe(($repeat) => {
  ipcRenderer.invoke('update:Repeat', $repeat)
})

export function getCurrent() {
  return queue.get().current?.item ?? null
}
export function getQueueLength() {
  const { userQueue, autoQueue } = queue.get()
  return userQueue.length + autoQueue.length
}
export function getByQueueIndex(index: number) {
  const { userQueue, autoQueue } = queue.get()
  if (index < userQueue.length) {
    return userQueue[index]
  } else {
    return autoQueue[index - userQueue.length]
  }
}

export function prependToUserQueue(trackIds: TrackID[]) {
  const items = trackIds.map(newQueueItem)
  queue.update((q) => {
    q.userQueue.unshift(...items)
    return q
  })
}
export function appendToUserQueue(trackIds: TrackID[]) {
  const items = trackIds.map(newQueueItem)
  queue.update((q) => {
    q.userQueue.push(...items)
    return q
  })
}

export function moveIndexes(indexes: number[], newIndex: number, top = false) {
  const ids: QueueItem[] = []
  queue.update((q) => {
    // Sort descending. We need to remove the last indexes first to not mess up the indexes
    for (const index of indexes.sort((a, b) => b - a)) {
      ids.push(removeIndex(q, index))
      if (index < newIndex) {
        newIndex--
      }
    }
    return q
  })
  // We sorted the indexes descending, so now reverse them
  return insertItems(ids.reverse(), newIndex, top)
}

export function insertItems(items: QueueItem[], index: number, top = false) {
  queue.update((q) => {
    const snapTop = index === q.userQueue.length && top
    if (index < q.userQueue.length || snapTop) {
      q.userQueue.splice(index, 0, ...items)
    } else {
      q.autoQueue.splice(index - q.userQueue.length, 0, ...items)
    }
    return q
  })
  return {
    from: index,
    to: index + items.length,
  }
}

export function insertIds(ids: TrackID[], index: number, top = false) {
  return insertItems(ids.map(newQueueItem), index, top)
}

function removeIndex(q: Queue, index: number): QueueItem {
  if (index < q.userQueue.length) {
    const [removed] = q.userQueue.splice(index, 1)
    return removed
  } else {
    const [removed] = q.autoQueue.splice(index - q.userQueue.length, 1)
    return removed
  }
}

export function removeIndexes(indexes: number[]) {
  queue.update((q) => {
    // we need to remove the last indexes first to not mess up the indexes
    for (const index of indexes.sort((a, b) => a - b).reverse()) {
      removeIndex(q, index)
    }
    return q
  })
}
export function removeDeleted() {
  const q = queue.get()
  const past = q.past.filter((qi) => methods.trackExists(qi.id))
  const current = q.current && methods.trackExists(q.current.item.id) ? q.current : null
  const userQueue = q.userQueue.filter((qi) => methods.trackExists(qi.id))
  const autoQueue = q.autoQueue.filter((qi) => methods.trackExists(qi.id))
  if (
    past.length !== q.past.length ||
    current !== null ||
    userQueue.length !== q.userQueue.length ||
    autoQueue.length !== q.autoQueue.length
  ) {
    queue.set({ past, current, userQueue, autoQueue })
  }
}

export function next() {
  const q = queue.get()
  if (q.current) {
    q.past.push(q.current.item)
  }
  if (q.userQueue.length) {
    q.current = {
      item: q.userQueue.shift()!,
      fromAutoQueue: false,
    }
  } else if (q.autoQueue.length) {
    if (repeat.get() && q.current) {
      q.autoQueue.push(newQueueItem(q.current.item.id))
    }
    q.current = {
      item: q.autoQueue.shift()!,
      fromAutoQueue: true,
    }
  } else {
    q.current = null
  }
  queue.set(q)
}
export function prev() {
  const q = queue.get()
  if (q.past.length) {
    if (q.current) {
      q.userQueue.unshift(q.current.item)
    }
    q.current = {
      item: q.past.pop()!,
      fromAutoQueue: false,
    }
    queue.set(q)
  }
}

// TODO: Preserve userQueue when setting a new queue. Before we do that, a clear user queue button would be nice
export function setNewQueue(newIds: TrackID[], newCurrentIndex: number) {
  const autoQueue = newIds.splice(newCurrentIndex + 1)
  const current = newIds.pop()
  queue.set({
    past: newIds.map(newQueueItem),
    current: current
      ? {
          item: newQueueItem(current),
          fromAutoQueue: true,
        }
      : null,
    userQueue: [],
    autoQueue: autoQueue.map(newQueueItem),
  })
  queue.removeDeleted()
  applyShuffle(get(shuffle))
}
