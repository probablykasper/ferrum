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
  // trackNum: string
  // trackCount: string
  // discNum: string
  // discCount: string
  // bpm: string
  // compilation: string
  // rating: string
  // liked: string
  // playCount: string
  comments: string
}

export const id: Writable<TrackID | null> = writable(null)
export const track: Writable<Track | null> = writable(null)
export const image = writable(null as null | Image)

export const visible = (() => {
  const store = writable(false)
  return {
    subscribe: store.subscribe,
    open: (newId: string) => {
      id.set(newId)
      track.set(methods.getTrack(newId))
      store.set(true)
      methods.loadTags(newId)
      loadImage()
    },
    set: (value: boolean) => {
      if (value === false) {
        store.set(false)
        id.set(null)
        track.set(null)
        image.set(null)
      }
    },
  }
})()

export function loadImage() {
  image.set(methods.getImage(0))
}
