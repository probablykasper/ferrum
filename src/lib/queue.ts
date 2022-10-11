/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { TrackID } from './libraryTypes'
import { writable } from 'svelte/store'
import { getterWritable } from './helpers'

export const queueVisible = writable(false)
export function toggleQueueVisibility() {
  queueVisible.update((v) => !v)
}

export type QueueItem = {
  qId: number
  id: TrackID
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
  }
})()

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
  return (userQueue as Partial<QueueItem[]>)[0] || autoQueue[0] || null
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
    for (const index of indexes) {
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
    for (const index of indexes) {
      removeIndex(q, index)
    }
    return q
  })
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
    userQueue: [],
    autoQueue: autoQueue.map(newQueueItem),
    past: newIds.map(newQueueItem),
  })
}
