import Gapless from 'gapless.js'
import { writable } from 'svelte/store'

export const currentTime = writable(0)
export const duration = writable(0)


const gPlayer = new Gapless.Queue({
  numberOfTracksToPreload: 2,
  onProgress: (track) => {
    if (track) {
      currentTime.set(track.currentTime)
      duration.set(track.duration)
    }
  },
})

export function playPause() {
  gPlayer.togglePlayPause()
}
export function previous() {
  gPlayer.playPrevious()
}
export function next() {
  gPlayer.playNext()
}
export function playTrack(id) {
  const trackPath = window.db.getTrackPath(id, true)
  gPlayer.tracks = []
  gPlayer.addTrack({ trackUrl: trackPath })
  gPlayer.play()
}
export function seek(to) {
  gPlayer.currentTrack.seek(to)
}
