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
  gPlayer.pauseAll()
  for (let i = 0; i < gPlayer.tracks.lengt; i++) {
    gPlayer.removeTrack(i)
  }
  gPlayer.tracks = []
  const trackPath = window.db.getTrackPath(id, true)
  gPlayer.addTrack({ trackUrl: trackPath })
  gPlayer.play()
  console.log(gPlayer)
}
export function seek(to) {
  gPlayer.currentTrack.seek(to)
}
