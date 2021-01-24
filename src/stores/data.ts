import { createEventDispatcher } from 'svelte'
import { writable } from 'svelte/store'
import type { Track, TrackListID, TrackListsHashMap } from './libraryTypes'
import { handlePlayerEvents } from './player'

type addon = {
  copy_file: Function
  atomic_file_save: Function
  load_data: (isDev: boolean, eventHandler: Function) => Data
}
declare global {
  interface Window {
    addon: addon
    showMessageBoxSync: Function
    readyToQuit: Function
  }
}

export function grabErr<T>(cb: () => T): T {
  try {
    return cb()
  } catch (err) {
    if (!err.message) {
      if (err.code) err.message = 'Code: '+err.code
      else err.message = 'No reason or code provided'
    }
    window.showMessageBoxSync({
      type: 'error',
      message: err.message,
      detail: err.stack,
    })
    throw err
  }
}

type OpenPlaylistInfo = {
  id: TrackListID
  sort_key: string
  sort_desc: boolean
  length: number
}

const isDev = process?.env?.NODE_ENV === 'development'
type Data = {
  get_track_lists: () => TrackListsHashMap
  set_open_playlist_id: (id: TrackListID) => void
  get_open_playlist_info: () => OpenPlaylistInfo
  get_open_playlist_track: (index: number) => Track
  get_open_playlist_track_ids: () => Track[]
  play_open_playlist_index: (index: number) => void
  play_pause: () => void
  sort: (key: string) => void
}
export const data: Data = grabErr(() => {
  return window.addon.load_data(isDev, eventHandler)
})

function eventHandler(err: any, msg: string) {
  grabErr(() => {
    console.log(':::EventHandler', msg, err)
    if (err) {
      err.message = 'Event error: '+err.message
      throw err
    }
    let handled = handlePlayerEvents(msg)
    if (!handled) {
      throw new Error(`Unexpected event "${msg}"`)
    }
  })
}

export const trackLists = grabErr(() => {
  const { subscribe, set, update } = writable(data.get_track_lists())
  return {
    subscribe,
  }
})

export const openPlaylist = grabErr(() => {
  function get () {
    const info = data.get_open_playlist_info()
    return {
      id: info.id,
      length: info.length,
      sort_key: info.sort_key,
      sort_desc: info.sort_desc,
      trackIds: data.get_open_playlist_track_ids(),
    }
  }

  const { subscribe, set, update } = writable(get())
  return {
    subscribe,
    playIndex: (index: number) => {
      data.play_open_playlist_index(index)
    },
    setId: (id: string) => {
      data.set_open_playlist_id(id)
      set(get())
    },
    sortBy: (key: string) => {
      data.sort(key)
      set(get())
    }
  }
})

export function getOpenPlaylistTrack(index: number): Track {
  return grabErr(() => {
    return data.get_open_playlist_track(index)
  })
}
