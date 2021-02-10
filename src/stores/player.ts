import { writable, get } from 'svelte/store'
import type { Writable } from 'svelte/store'
const { ipcRenderer } = window.require('electron')
import quit from './quit'
import { methods, openPlaylist, tracksDir } from './data'
import type { Track, TrackID } from './libraryTypes'
import window from './window'

const audio = new Audio()
let isStopped = true
export const stopped = (() => {
  const { subscribe, set } = writable(true)
  return {
    subscribe,
    set: (value: boolean) => {
      isStopped = value
      set(value)
    },
  }
})()
export const paused = writable(true)
export const currentTime = writable(0)
export const duration = writable(0)
let queue: TrackID[] = []
let playingIndex = 0
export const playingTrack: Writable<Track | null> = writable(null)
let waitingToPlay = false

audio.ontimeupdate = (e) => {
  currentTime.set(audio.currentTime)
}

audio.addEventListener('error', (e) => {
  stop()
  let message = 'Audio playback error'
  let detail = ''
  let el = e.target as HTMLAudioElement
  if (!window.existsSync(audio.src)) {
    message = 'File not found'
  } else if (el && el.error && !window.existsSync(audio.src)) {
    detail = el.error.message
  } else if (el) {
    detail = 'Unknown error, no audio error found'
  } else {
    detail = 'Unknown error, no audio element found'
  }
  window.showMessageBoxSync({ type: 'error', message, detail })
})

let startTime = 0
let playTime = 0

let playTimeCounter: NodeJS.Timeout

function startPlayback() {
  audio.play()
  playTimeCounter = setInterval(() => {
    playTime += 50
  }, 50)
  playTime = 0
  paused.set(false)
}

function startPlayingIndex(index: number) {
  const id = queue[index]
  const track = methods.getTrack(id)
  const fileUrl = window.toFileUrl(tracksDir, track.file)
  waitingToPlay = true
  audio.src = fileUrl
  playingIndex = index
  playingTrack.set(track)
}

audio.oncanplay = (e) => {
  if (waitingToPlay) {
    waitingToPlay = false
    startPlayback()
    startTime = Date.now()
    stopped.set(false)
  }
}

audio.ondurationchange = () => {
  duration.set(audio.duration)
}

function savePlayTime() {
  clearInterval(playTimeCounter)
  if (playTime >= 1000) {
    console.log('    Yep')
  }
  playTime = 0
}

function pausePlayback() {
  waitingToPlay = false
  audio.pause()
  paused.set(true)
  savePlayTime()
}

export function playIndex(index: number) {
  if (!isStopped) pausePlayback()
  queue = openPlaylist.getTrackIds()
  startPlayingIndex(index)
}

export function playPause() {
  if (audio.paused) startPlayback()
  else pausePlayback()
}

ipcRenderer.on('playPause', () => {
  playPause()
})

export function stop() {
  waitingToPlay = false
  audio.pause()
  paused.set(true)
  savePlayTime()
  stopped.set(true)
  seek(0)
}

quit.setHandler('player', () => {
  stop()
})

audio.onended = (e) => {
  const newIndex = playingIndex + 1
  if (newIndex < queue.length) {
    savePlayTime()
    methods.addPlay(queue[playingIndex])
    startPlayingIndex(newIndex)
  } else {
    stop()
  }
}

export function next() {
  const newIndex = playingIndex + 1
  if (newIndex < queue.length) {
    savePlayTime()
    methods.addSkip(queue[playingIndex])
    startPlayingIndex(newIndex)
  } else {
    stop()
  }
}
export function previous() {
  const newIndex = playingIndex - 1
  if (newIndex >= 0) {
    savePlayTime()
    methods.addSkip(queue[playingIndex])
    startPlayingIndex(newIndex)
  } else {
    stop()
  }
}

document.addEventListener('keydown', (e) => {
  let el = e.target as HTMLAudioElement
  if (el && el.tagName === 'INPUT') return
  if (el && el.tagName === 'TEXTAREA') return
  if (e.key === ' ') {
    playPause()
  }
})

export function seek(to: number) {
  audio.currentTime = to
  currentTime.set(to)
}
