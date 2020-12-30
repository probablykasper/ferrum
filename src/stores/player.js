import { writable } from 'svelte/store'
let library = db.get()

export const currentTime = writable(0)
export const duration = writable(0)
let trackList = []
let trackIndex = null
export const stopped = writable(true)

if (window.audio) window.audio.pause() // for hmr: garbage collect old audio

window.audio = new Audio() // hmr:@keep
let audio = window.audio
audio.onerror = (e) => {
  console.error('audioOnError', e)
}
audio.onended = (e) => {
  const newIndex = trackIndex + 1
  if (newIndex < trackList.length) {
    const newId = trackList[newIndex]
    const trackPath = window.db.getTrackPath(newId, true)
    audio.src = trackPath
    audio.play()
  } else {
    stop()
  }
  trackIndex = newIndex
}
audio.ontimeupdate = (e) => {
  currentTime.set(audio.currentTime)
  duration.set(audio.duration)
}

function play(id) {
  const trackPath = window.db.getTrackPath(id, true)
  audio.src = trackPath
  audio.play()
  stopped.set(false)
}
export function playPause() {
  if (audio.paused) audio.play()
  else audio.pause()
}
export function previous() {
  const newIndex = trackIndex - 1
  if (newIndex >= 0) {
    play(trackList[newIndex])
  } else {
    stop()
  }
  trackIndex = newIndex
}
export function next() {
  const newIndex = trackIndex + 1
  if (newIndex < trackList.length) {
    play(trackList[newIndex])
  } else {
    stop()
  }
  trackIndex = newIndex
}
export function stop() {
  trackList = []
  trackIndex = null
  audio.pause()
  stopped.set(true)
  seek(0)
}
export function playTrack(list, index) {
  trackList = list
  trackIndex = index
  play(list[index])
}
export function seek(to) {
  audio.currentTime = to
  currentTime.set(to)
}
