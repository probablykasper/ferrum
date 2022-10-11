/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { TrackID } from './libraryTypes'
import { writable } from 'svelte/store'
import { getterWritable } from './helpers'

export const queueVisible = writable(false)
export function toggleQueueVisibility() {
  queueVisible.update((v) => !v)
}

export type Queue = {
  past: TrackID[]
  userQueue: TrackID[]
  autoQueue: TrackID[]
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
  }
})()

export function getCurrent() {
  const { past } = queue.get()
  return past[past.length - 1] || null
}
export function getPrevious() {
  const { past } = queue.get()
  return past[past.length - 2] || null
}
export function getNext() {
  const { userQueue, autoQueue } = queue.get()
  return userQueue[0] || autoQueue[0] || null
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
  queue.update((q) => {
    q.userQueue.unshift(...trackIds)
    return q
  })
}
export function appendToUserQueue(trackIds: TrackID[]) {
  queue.update((q) => {
    q.userQueue.push(...trackIds)
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
    autoQueue,
    past: newIds,
  })
}
