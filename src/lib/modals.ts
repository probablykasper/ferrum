import { writable } from 'svelte/store'

let count = 0
const store = writable(count)
export const visibleModalsCount = {
  subscribe: store.subscribe,
  set(value: number) {
    count = value
    store.set(value)
  },
  get() {
    return count
  },
}
