/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { TrackID } from 'ferrum-addon'
import { writable } from 'svelte/store'
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

export type Queue = {
  past: QueueItem[]
  userQueue: QueueItem[]
  autoQueue: QueueItem[]
}
export const queue = (() => {
  const store = getterWritable({
    past: [],
    userQueue: [],
    autoQueue: [],
  } as Queue)
  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,
    get: store.get,
    getCurrent,
    getPrevious,
    getNext,
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
shuffle.subscribe(($shuffle) => {
  queue.update((q) => {
    if ($shuffle) {
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
})
ipcRenderer.on('Shuffle', () => {
  shuffle.update((value) => !value)
})

export function getCurrent() {
  const { past } = queue.get()
  return (past as Partial<QueueItem[]>)[past.length - 1] || null
}
export function getPrevious() {
  const { past } = queue.get()
  return (past as Partial<QueueItem[]>)[past.length - 2] || null
}
export function getNext() {
  const { userQueue, autoQueue } = queue.get()
  return (userQueue as Partial<QueueItem[]>)[0] || (autoQueue as Partial<QueueItem[]>)[0] || null
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
    // we need to remove the last indexes first to not mess up the indexes
    for (const index of indexes.sort().reverse()) {
      ids.push(removeIndex(q, index))
      if (index < newIndex) {
        newIndex--
      }
    }
    return q
  })
  return insertItems(ids, newIndex, top)
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
    for (const index of indexes.sort().reverse()) {
      removeIndex(q, index)
    }
    return q
  })
}
export function removeDeleted() {
  const q = queue.get()
  const past = q.past.filter((qi) => methods.trackExists(qi.id))
  const userQueue = q.userQueue.filter((qi) => methods.trackExists(qi.id))
  const autoQueue = q.autoQueue.filter((qi) => methods.trackExists(qi.id))
  if (
    past.length !== q.past.length ||
    userQueue.length !== q.userQueue.length ||
    autoQueue.length !== q.autoQueue.length
  ) {
    queue.set({ userQueue, autoQueue, past })
  }
}

export function next() {
  const q = queue.get()
  if (q.userQueue.length) {
    q.past.push(q.userQueue.shift()!)
    queue.set(q)
  } else if (q.autoQueue.length) {
    q.past.push(q.autoQueue.shift()!)
    queue.set(q)
  }
}
export function prev() {
  const q = queue.get()
  // the last item is the current track, which we don't wanna remove
  if (q.past.length >= 2) {
    const current = q.past.pop()!
    q.userQueue.unshift(current)
    queue.set(q)
  }
}

// TODO: Preserve userQueue when setting a new queue. Before we do that, a clear user queue button would be nice
export function setNewQueue(newIds: TrackID[], newCurrentIndex: number) {
  const autoQueue = newIds.splice(newCurrentIndex + 1)
  queue.set({
    userQueue: [{ qId: 23818328, id: 'dss' }],
    autoQueue: autoQueue.map(newQueueItem),
    past: newIds.map(newQueueItem),
  })
  queue.removeDeleted()
}
