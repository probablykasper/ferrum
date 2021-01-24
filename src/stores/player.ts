import { writable } from 'svelte/store'
import { data, grabErr } from './data'

export const stopped = writable(true)
export const paused = writable(true)

export const playPause = () => {
  return grabErr(() => {
    data.play_pause()
  })
}

export function handlePlayerEvents(msg: any) {
  if (msg === 'Play') {
    paused.set(false)
    stopped.set(false)
  } else if (msg === 'Pause') {
    paused.set(true)
  } else {
    return true
  }
}
