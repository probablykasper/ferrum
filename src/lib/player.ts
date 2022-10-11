import { writable } from 'svelte/store'
import type { Writable } from 'svelte/store'
import { clamp } from './helpers'
import quit from './quit'
import { methods, paths } from './data'
import type { Track, TrackID } from './libraryTypes'
import { showMessageBox, ipcRenderer, joinPaths } from './window'
import * as queue from './queue'

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
export const playingTrack: Writable<Track | null> = writable(null)
export const playingId = (() => {
  const store: Writable<TrackID | null> = writable(null)
  return {
    set(id: TrackID) {
      store.set(id)
      coverSrc.newFromTrackId(id)
    },
    subscribe: store.subscribe,
  }
})()
let waitingToPlay = false
const mediaSession = navigator.mediaSession

export const volume = (() => {
  let lastVolume = 1
  const store = writable(1)
  audio.addEventListener('volumechange', () => {
    store.set(audio.volume)
  })
  function set(value: number) {
    lastVolume = audio.volume
    audio.volume = clamp(0, 1, value)
    store.set(clamp(0, 1, value))
  }
  return {
    set,
    toggle() {
      if (audio.volume > 0) set(0)
      else set(lastVolume || 1)
    },
    subscribe: store.subscribe,
  }
})()
ipcRenderer.on('volumeUp', () => {
  volume.set(audio.volume + 0.05)
})
ipcRenderer.on('volumeDown', () => {
  volume.set(audio.volume - 0.05)
})

export const coverSrc = (() => {
  const { set, subscribe }: Writable<string | null> = writable(null)
  return {
    async newFromTrackId(id: TrackID) {
      try {
        const buf = await methods.readCoverAsync(id)
        const url = URL.createObjectURL(new Blob([buf], {}))
        set(url)
      } catch (e) {
        set(null)
      }
    },
    subscribe,
  }
})()

audio.ontimeupdate = () => {
  currentTime.set(audio.currentTime)
}

audio.addEventListener('error', async (e) => {
  stop()
  let message = 'Audio playback error'
  let detail = 'Unknown error'
  const audio = e.target as HTMLAudioElement
  if (audio && audio.error) {
    detail = audio.error.message
    if (audio.error.code === audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED) {
      if (audio.networkState === audio.NETWORK_NO_SOURCE) {
        message = 'File not found'
        detail = ''
      }
    }
  }
  await showMessageBox({ type: 'error', message, detail })
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

function startPlayingId(id: TrackID) {
  const track = methods.getTrack(id)
  const fileUrl = 'track:' + joinPaths(paths.tracks_dir, track.file)
  waitingToPlay = true
  audio.src = fileUrl
  playingTrack.set(track)
  playingId.set(id)
  if (mediaSession) {
    mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artist,
      album: track.albumName || '',
      // artwork: [{ src: 'podcast.jpg' }],
    })
  }
}

audio.oncanplay = () => {
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
    methods.addPlayTime(queue.getCurrent(), startTime, playTime)
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

export function newPlaybackInstance(newQueue: TrackID[], index: number) {
  if (!isStopped) pausePlayback()
  queue.setNewQueue(newQueue, index)
  startPlayingId(queue.getCurrent())
}

export function playPause() {
  if (isStopped) return
  else if (audio.paused) startPlayback()
  else pausePlayback()
}

export function reload() {
  if (isStopped) return
  const currentTime = audio.currentTime
  audio.src = ''
  audio.load()
  startPlayingId(queue.getCurrent())
  audio.currentTime = currentTime
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

audio.onended = () => {
  const nextId = queue.getNext()
  if (nextId) {
    savePlayTime()
    methods.addPlay(queue.getCurrent())
    startPlayingId(nextId)
    queue.next()
  } else {
    stop()
  }
}

export function next() {
  const nextId = queue.getNext()
  if (nextId) {
    savePlayTime()
    methods.addSkip(queue.getCurrent())
    startPlayingId(nextId)
    queue.next()
  } else {
    stop()
  }
}
export function previous() {
  const prevId = queue.getPrevious()
  if (prevId) {
    savePlayTime()
    methods.addSkip(queue.getCurrent())
    startPlayingId(prevId)
    queue.prev()
  } else {
    stop()
  }
}

export function seek(to: number, fastSeek = false) {
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
    if (details.seekTime && details.fastSeek) {
      seek(details.seekTime, details.fastSeek)
    }
  })
  mediaSession.setActionHandler('previoustrack', previous)
  mediaSession.setActionHandler('nexttrack', next)
}

ipcRenderer.on('playPause', playPause)
ipcRenderer.on('next', next)
ipcRenderer.on('previous', previous)
ipcRenderer.on('stop', stop)
