import { writable } from 'svelte/store'
import type { Writable } from 'svelte/store'
const { ipcRenderer } = window.require('electron')
import quit from './quit'
import { methods, openPlaylist, paths } from './data'
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
const mediaSession = navigator.mediaSession

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
    playTime += 20
  }, 20)
  playTime = 0
  paused.set(false)
  if (mediaSession) mediaSession.playbackState = 'playing'
}

function startPlayingIndex(index: number) {
  const id = queue[index]
  const track = methods.getTrack(id)
  const fileUrl = window.toFileUrl(paths.tracks_dir, track.file)
  waitingToPlay = true
  audio.src = fileUrl
  playingIndex = index
  playingTrack.set(track)
  if (mediaSession) {
    mediaSession.metadata = new MediaMetadata({
      title: track.name || '',
      artist: track.artist || '',
      album: track.albumName || '',
      // artwork: [{ src: 'podcast.jpg' }],
    })
  }
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
    methods.addPlayTime(queue[playingIndex], startTime, playTime)
  }
  playTime = 0
}

function pausePlayback() {
  waitingToPlay = false
  audio.pause()
  paused.set(true)
  savePlayTime()
  if (mediaSession) mediaSession.playbackState = 'paused'
}

export function playIndex(index: number) {
  if (!isStopped) pausePlayback()
  queue = openPlaylist.getTrackIds()
  startPlayingIndex(index)
}

export function playPause() {
  if (isStopped) return
  else if (audio.paused) startPlayback()
  else pausePlayback()
}

export function stop() {
  waitingToPlay = false
  audio.pause()
  paused.set(true)
  savePlayTime()
  stopped.set(true)
  seek(0)
  if (mediaSession) {
    mediaSession.playbackState = 'none'
    mediaSession.metadata = null
  }
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
  if (e.key === ' ') playPause()
})

export function seek(to: number, fastSeek: boolean = false) {
  const newTime = Math.min(to, audio.duration || 0)
  if (fastSeek && audio.fastSeek) {
    audio.fastSeek(to)
  } else {
    audio.currentTime = newTime
  }
  currentTime.set(newTime)
}

if (navigator.mediaSession) {
  const mediaSession = navigator.mediaSession
  mediaSession.setActionHandler('play', startPlayback)
  mediaSession.setActionHandler('pause', pausePlayback)
  mediaSession.setActionHandler('stop', stop)
  mediaSession.setActionHandler('seekbackward', (details) => {
    seek(audio.currentTime - (details.seekOffset || 5))
  })
  mediaSession.setActionHandler('seekforward', (details) => {
    seek(audio.currentTime + (details.seekOffset || 5))
  })
  mediaSession.setActionHandler('seekto', (details) => {
    seek(details.seekTime, details.fastSeek)
  })
  mediaSession.setActionHandler('previoustrack', previous)
  mediaSession.setActionHandler('nexttrack', next)
}

ipcRenderer.on('playPause', playPause)
ipcRenderer.on('next', next)
ipcRenderer.on('previous', previous)
ipcRenderer.on('stop', stop)