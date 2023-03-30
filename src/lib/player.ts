import { derived, writable } from 'svelte/store'
import type { Writable } from 'svelte/store'
import { clamp } from './helpers'
import quit from './quit'
import { methods, paths } from './data'
import type { Track, TrackID } from 'ferrum-addon'
import { ipcRenderer, joinPaths } from './window'
import { queue, setNewQueue, next as queueNext, prev as queuePrev } from './queue'

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
export const playingId = derived(queue, () => {
  const currentId = queue.getCurrent()?.id
  if (currentId) {
    coverSrc.newFromTrackId(currentId)
  }
  return currentId
})
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
  await ipcRenderer.invoke('showMessageBox', false, { type: 'error', message, detail })
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

function setPlayingFile(id: TrackID, paused = false) {
  const track = methods.getTrack(id)
  const fileUrl = 'track:' + joinPaths(paths.tracksDir, track.file)
  waitingToPlay = !paused
  audio.src = fileUrl
  playingTrack.set(track)
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

/** Saves play time if needed */
function savePlayTime() {
  clearInterval(playTimeCounter)
  const currentId = queue.getCurrent()?.id
  if (playTime >= 1000 && currentId) {
    methods.addPlayTime(currentId, startTime, playTime)
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
  setNewQueue(newQueue, index)
  const current = queue.getCurrent()
  if (current) {
    setPlayingFile(current.id)
  }
}

export function playPause() {
  if (isStopped) return
  else if (audio.paused) startPlayback()
  else pausePlayback()
}

export function reload() {
  const id = queue.getCurrent()?.id
  const wasPaused = audio.paused
  if (id && !isStopped) {
    const currentTime = audio.currentTime
    audio.src = ''
    audio.load()
    setPlayingFile(id, wasPaused)
    audio.currentTime = currentTime
  }
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
  next(false)
}

export function skipToNext() {
  next(true)
}

function next(skip: boolean) {
  const currentId = queue.getCurrent()?.id
  if (currentId) {
    if (skip) {
      methods.addSkip(currentId)
    } else {
      methods.addPlay(currentId)
    }
    savePlayTime()
    queueNext()
    const newCurrentId = queue.getCurrent()?.id
    if (newCurrentId) {
      setPlayingFile(newCurrentId)
    } else {
      stop()
    }
  }
}
export function previous() {
  const currentId = queue.getCurrent()?.id
  if (currentId) {
    savePlayTime()
    methods.addSkip(currentId)
    queuePrev()
    const newCurrentId = queue.getCurrent()?.id
    if (newCurrentId) {
      setPlayingFile(newCurrentId)
    } else {
      // this should never happen because the first track will play again
      stop()
    }
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
  mediaSession.setActionHandler('nexttrack', skipToNext)
}

ipcRenderer.on('playPause', playPause)
ipcRenderer.on('Next', skipToNext)
ipcRenderer.on('Previous', previous)
ipcRenderer.on('Stop', stop)
