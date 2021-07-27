import { writable } from 'svelte/store'
import type { Writable } from 'svelte/store'
import { methods } from '../stores/data'
import type { Track, TrackID } from 'src/stores/libraryTypes'

export const visible = writable(false)
export const id: Writable<TrackID | null> = writable(null)
export const track: Writable<Track | null> = writable(null)
export function open(newId: TrackID) {
  id.set(newId)
  track.set(methods.getTrack(newId))
  coverSrc.reset()
  visible.set(true)
  coverSrc.newFromTrackId(newId)
}

export const coverSrc = (() => {
  const { set, subscribe }: Writable<string | null> = writable(null)
  return {
    async newFromTrackId(id: TrackID) {
      try {
        let buf = await methods.readCoverAsync(id)
        let url = URL.createObjectURL(new Blob([buf], {}))
        set(url)
      } catch (e) {
        set(null)
      }
    },
    reset() {
      set(null)
    },
    subscribe,
  }
})()
