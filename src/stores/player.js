import { writable } from 'svelte/store'
const { ipcRenderer } = window.require('electron')

export const currentTime = writable(0)
export const duration = writable(0)
let trackList = []
let trackIndex = null
const getCurrentId = () => trackList[trackIndex]
export const stopped = writable(true)

const now = () => new Date().getTime()
let playTimeStart = null

if (window.audio) window.audio.pause() // for hmr: garbage collect old audio

window.audio = new Audio() // hmr:@keep
let audio = window.audio
audio.onerror = (e) => {
  console.error('audioOnError', e)
}
audio.onended = (e) => {
  window.db.addPlayTime(getCurrentId(), playTimeStart)
  playTimeStart = null
  window.db.addPlay(getCurrentId())
  const newIndex = trackIndex + 1
  if (newIndex < trackList.length) {
    const newId = trackList[newIndex]
    const trackPath = window.db.getTrackPath(newId, true)
    audio.src = trackPath
    audio.play()
    playTimeStart = now()
  } else {
    stop()
  }
  trackIndex = newIndex
}
audio.ontimeupdate = (e) => {
  currentTime.set(audio.currentTime)
  duration.set(audio.duration)
}

function play(index) {
  const id = trackList[index]
  const trackPath = window.db.getTrackPath(id, true)
  audio.src = trackPath
  audio.play()
  playTimeStart = now()
  stopped.set(false)
}
export function playPause() {
  if (audio.paused) {
    audio.play()
    playTimeStart = now()
  }
  else {
    window.db.addPlayTime(getCurrentId(), playTimeStart)
    playTimeStart = null
    audio.pause()
  }
}
export function previous() {
  const newIndex = trackIndex - 1
  if (newIndex >= 0) {
    play(newIndex)
  } else {
    stop()
  }
  trackIndex = newIndex
}
export function skip() {
  window.db.addSkip(getCurrentId())
  const newIndex = trackIndex + 1
  if (newIndex < trackList.length) {
    play(newIndex)
  } else {
    stop()
  }
  trackIndex = newIndex
}
export function stop() {
  trackList = []
  trackIndex = null
  window.db.addPlayTime(getCurrentId(), playTimeStart)
  playTimeStart = null
  audio.pause()
  stopped.set(true)
  seek(0)
}
ipcRenderer.on('gonnaQuit', async() => {
  audio.pause()
  stopped.set(true)
  // check audio.paused just in case:
  if (playTimeStart !== null && !audio.paused) {
    await window.db.addPlayTime(getCurrentId(), playTimeStart)
    playTimeStart = null
  }
  window.readyToQuit('addedPlayTime')
})
export function playTrack(list, index) {
  trackList = list
  trackIndex = index
  play(index)
}
export function seek(to) {
  audio.currentTime = to
  currentTime.set(to)
}
