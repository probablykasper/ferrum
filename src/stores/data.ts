import { writable, readable, derived } from 'svelte/store'
import type {
  MsSinceUnixEpoch,
  Track,
  TrackID,
  TrackListID,
  TrackListsHashMap,
} from './libraryTypes'
import { showMessageBox, addon } from './window'

export function grabErr<T>(cb: () => T): T {
  try {
    return cb()
  } catch (err) {
    if (!err.message) {
      if (err.code) err.message = 'Code: ' + err.code
      else err.message = 'No reason or code provided'
    }
    showMessageBox({
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
      showMessageBox({
        type: 'error',
        message: err.message,
        detail: err.stack,
      })
      throw err
    }
  }
}

type PageInfo = {
  id: TrackListID
  sort_key: string
  sort_desc: boolean
  length: number
}

export const isDev = process.env.NODE_ENV === 'development'
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
  read_cover_async: (id: TrackID) => Promise<ArrayBuffer>

  refresh_page: () => void
  open_playlist: (id: TrackListID) => void
  get_page_track_ids: () => TrackID[]
  filter_open_playlist: (query: string) => TrackID[]
  get_page_track: (index: number) => Track
  get_page_track_id: (index: number) => string
  get_page_info: () => PageInfo
  sort: (key: string, keep_filter: boolean) => void
}
const data: Data = grabErr(() => {
  return addon.load_data(isDev)
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

export async function importTracks(paths: [string]) {
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
      const result = await showMessageBox({
        type: 'error',
        message: 'Error importing track ' + path,
        detail: err.message,
        buttons: errState ? ['OK', 'Skip all errors'] : ['OK'],
        defaultId: 0,
      })
      if (result.buttonClicked === 1) errState = 'skip'
      else errState = 'skippable'
    }
  }
  methods.save()
  page.refresh()
}

export const methods = {
  importTrack: wrapErr((path: string) => {
    data.import_track(path)
  }),
  getTrack: wrapErr((id: TrackID) => {
    return data.get_track(id)
  }),
  save: wrapErr(() => data.save()),
  addPlay: wrapErr((id: TrackID) => {
    data.add_play(id)
    methods.save()
    page.refresh()
  }),
  addSkip: wrapErr((id: TrackID) => {
    data.add_skip(id)
    methods.save()
    page.refresh()
  }),
  addPlayTime: wrapErr((id: TrackID, startTime: MsSinceUnixEpoch, durationMs: number) => {
    data.add_play_time(id, startTime, durationMs)
    methods.save()
    page.refresh()
  }),
  readCoverAsync: wrapErr((id: TrackID) => data.read_cover_async(id)),
}

export const filterQuery = writable('')
export const page = grabErr(() => {
  function get() {
    const info = data.get_page_info()
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
      data.refresh_page()
      set(get())
    },
    openPlaylist: (id: string) => {
      data.open_playlist(id)
      set(get())
      filterQuery.set('')
    },
    sortBy: (key: string) => {
      data.sort(key, true)
      set(get())
    },
    filter: (query: string) => {
      data.filter_open_playlist(query)
      set(get())
    },
    getTrack: (index: number): Track => {
      return data.get_page_track(index)
    },
    getTrackId: (index: number) => {
      return data.get_page_track_id(index)
    },
    getTrackIds: () => {
      return data.get_page_track_ids()
    },
  }
})
