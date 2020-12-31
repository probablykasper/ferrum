import { writable } from 'svelte/store'

let library = db.get()

export const trackLists = (() => {
  const { subscribe, set, update } = writable(library.trackLists)

  return {
    subscribe,
  }
})()
