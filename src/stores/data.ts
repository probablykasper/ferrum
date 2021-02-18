import { writable, readable } from 'svelte/store'
import type {
  MsSinceUnixEpoch,
  Track,
  TrackID,
  TrackListID,
  TrackListsHashMap,
} from './libraryTypes'
import window from './window'

export function grabErr<T>(cb: () => T): T {
  try {
    return cb()
  } catch (err) {
    if (!err.message) {
      if (err.code) err.message = 'Code: ' + err.code
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

export function wrapErr<T, A extends Array<any>>(cb: (...args: A) => T): (...args: A) => T {
  return (...args) => {
    try {
      return cb(...args)
    } catch (err) {
      if (!err.message) {
        if (err.code) err.message = 'Code: ' + err.code
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
}

type OpenPlaylistInfo = {
  id: TrackListID
  sort_key: string
  sort_desc: boolean
  length: number
}

export const isDev = process?.env?.NODE_ENV === 'development'
export type Data = {
  get_paths: () => {
    library_dir: string
    tracks_dir: string
    artworks_dir: string
    library_json: string
  }
  save: () => void
  get_tracks_dir: () => string
  get_library_json_path: () => string

  get_track_lists: () => TrackListsHashMap

  import_track: (path: string) => void
  get_track: (id: TrackID) => Track
  add_play: (id: TrackID) => void
  add_skip: (id: TrackID) => void
  add_play_time: (id: TrackID, startTime: MsSinceUnixEpoch, duration_ms: number) => void

  refresh_open_playlist: () => void
  open_playlist: (id: TrackListID) => void
  get_open_playlist_sorted_track_ids: () => [TrackID]
  get_open_playlist_track: (index: number) => Track
  get_open_playlist_track_id: (index: number) => string
  get_open_playlist_info: () => OpenPlaylistInfo
  sort: (key: string) => void
}
const data: Data = grabErr(() => {
  return window.addon.load_data(isDev)
})
export const trackLists = grabErr(() => {
  const { subscribe, set, update } = writable(data.get_track_lists())
  return {
    subscribe,
  }
})

export const paths = grabErr(() => {
  return data.get_paths()
})

export function importTracks(paths: [string]) {
  let errState = null
  for (const path of paths) {
    try {
      data.import_track(path)
    } catch (err) {
      if (!err.message) {
        if (err.code) err.message = 'Code: ' + err.code
        else err.message = 'No reason or code provided'
      }
      if (errState === 'skip') continue
      const clickedButton = window.showMessageBoxSync({
        type: 'error',
        message: 'Error importing track ' + path,
        detail: err.message,
        buttons: errState ? ['OK', 'Skip all errors'] : ['OK'],
        defaultId: 0,
      })
      if (clickedButton === 1) errState = 'skip'
      else errState = 'skippable'
    }
  }
  methods.save()
  openPlaylist.refresh()
}

export const methods = {
  importTrack: wrapErr((path: string) => {
    data.import_track(path)
  }),
  getTrack: wrapErr((id: TrackID) => {
    return data.get_track(id)
  }),
  save: wrapErr(() => {
    data.save()
  }),
  addPlay: wrapErr((id: TrackID) => {
    data.add_play(id)
    methods.save()
    openPlaylist.refresh()
  }),
  addSkip: wrapErr((id: TrackID) => {
    data.add_skip(id)
    methods.save()
    openPlaylist.refresh()
  }),
  addPlayTime: wrapErr((id: TrackID, startTime: MsSinceUnixEpoch, durationMs: number) => {
    data.add_play_time(id, startTime, durationMs)
    methods.save()
    openPlaylist.refresh()
  }),
}

export const openPlaylist = grabErr(() => {
  function get() {
    const info = data.get_open_playlist_info()
    return {
      id: info.id,
      length: info.length,
      sort_key: info.sort_key,
      sort_desc: info.sort_desc,
    }
  }

  const { subscribe, set, update } = writable(get())
  return {
    subscribe,
    refresh: () => {
      data.refresh_open_playlist()
      set(get())
    },
    setId: (id: string) => {
      data.open_playlist(id)
      set(get())
    },
    sortBy: (key: string) => {
      data.sort(key)
      set(get())
    },
    getTrack: (index: number): Track => {
      return data.get_open_playlist_track(index)
    },
    getTrackId: (index: number) => {
      return data.get_open_playlist_track_id(index)
    },
    getTrackIds: () => {
      return data.get_open_playlist_sorted_track_ids()
    },
  }
})
