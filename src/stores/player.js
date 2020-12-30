import Gapless from 'gapless.js'
import { writable } from 'svelte/store'
let library = db.get()

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
  const currentId = gPlayer.currentTrack.metadata.id
  db.addSkip(currentId)
  gPlayer.playNext()
}
export function playTrack(id) {
  gPlayer.pauseAll()
  for (let i = 0; i < gPlayer.tracks.length; i++) {
    gPlayer.removeTrack(i)
  }
  const trackPath = window.db.getTrackPath(id, true)
  gPlayer.addTrack({ trackUrl: trackPath })
  gPlayer.gotoTrack(0, true)
}
export function seek(to) {
  gPlayer.currentTrack.seek(to)
}
