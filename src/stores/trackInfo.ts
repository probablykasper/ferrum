import { writable } from 'svelte/store'
import type { Writable } from 'svelte/store'
import { methods } from '../stores/data'
import type { Track, Image, TrackID } from 'src/stores/libraryTypes'

export type TrackMD = {
  name: string
  artist: string
  albumName: string
  albumArtist: string
  composer: string
  grouping: string
  genre: string
  year: string
  trackNum: string
  trackCount: string
  discNum: string
  discCount: string
  bpm: string
  // compilation: string
  // rating: string
  // liked: string
  // playCount: string
  comments: string
}

type Current = {
  ids: TrackID[]
  index: number
}
let current: Current | null = null

export const id: Writable<TrackID | null> = writable(null)
export const track: Writable<Track | null> = writable(null)
export const image = writable(null as null | Image)

export function openPrev() {
  if (current) openIndex(current.index - 1)
}
export function openNext() {
  if (current) openIndex(current.index + 1)
}

function openIndex(index: number) {
  if (current && index >= 0 && index < current.ids.length) {
    current.index = index
    id.set(current.ids[index])
    track.set(methods.getTrack(current.ids[index]))
    methods.loadTags(current.ids[index])
    loadImage()
  }
}
function close() {
  id.set(null)
  track.set(null)
  image.set(null)
}

export const visible = (() => {
  const store = writable(false)
  return {
    subscribe: store.subscribe,
    open: (ids: string[], index: number) => {
      current = { ids, index }
      openIndex(index)
      store.set(true)
    },
    set: (value: boolean) => {
      if (value === false) {
        store.set(false)
        close()
      }
    },
  }
})()

export function loadImage() {
  image.set(methods.getImage(0))
}
