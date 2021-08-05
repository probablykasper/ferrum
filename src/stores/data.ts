import { writable, readable, derived } from 'svelte/store'
import type {
  MsSinceUnixEpoch,
  Track,
  TrackID,
  TrackList,
  TrackListID,
  TrackListsHashMap,
} from './libraryTypes'
import type { TrackMD } from './trackInfo'
import { showMessageBox, addon } from './window'

type PageInfo = {
  id: TrackListID
  tracklist: TrackList
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

  import_track: (path: string) => void
  get_track: (id: TrackID) => Track
  add_play: (id: TrackID) => void
  add_skip: (id: TrackID) => void
  add_play_time: (id: TrackID, startTime: MsSinceUnixEpoch, duration_ms: number) => void
  read_cover_async: (id: TrackID) => Promise<ArrayBuffer>
  update_track_info: (id: TrackID, md: string) => void

  get_track_lists: () => TrackListsHashMap
  add_tracks_to_playlist: (playlistId: TrackListID, trackIds: TrackID[]) => void
  remove_from_open_playlist: (indexes: number[]) => void

  refresh_page: () => void
  open_playlist: (id: TrackListID) => void
  get_page_track_ids: () => TrackID[]
  filter_open_playlist: (query: string) => TrackID[]
  get_page_track: (index: number) => Track
  get_page_track_id: (index: number) => string
  get_page_info: () => PageInfo
  sort: (key: string, keep_filter: boolean) => void
  move_tracks: (indexes: number[], to_index: number) => { from: number; to: number }
}

function runWrapped<T>(cb: () => T): T {
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

const dataInternal: Data = runWrapped(() => {
  return addon.load_data(isDev)
})

const data = dataInternal
export function call<T>(cb: (data: Data) => T): T {
  try {
    return cb(dataInternal)
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

export const trackLists = (() => {
  const initial = call((data) => data.get_track_lists())
  const { subscribe, set, update } = writable(initial)
  return {
    subscribe,
    getOnce: () => initial,
  }
})()
export function addTracksToPlaylist(playlistId: TrackListID, trackIds: TrackID[]) {
  call((data) => data.add_tracks_to_playlist(playlistId, trackIds))
  page.refresh()
  methods.save()
}
export function removeFromOpenPlaylist(indexes: number[]) {
  call((data) => data.remove_from_open_playlist(indexes))
  page.refresh()
  methods.save()
}

export const paths = (() => {
  return call((data) => data.get_paths())
})()

export async function importTracks(paths: string[]) {
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
  importTrack: (path: string) => {
    call((data) => data.import_track(path))
  },
  getTrack: (id: TrackID) => {
    return call((data) => data.get_track(id))
  },
  save: () => data.save(),
  addPlay: (id: TrackID) => {
    call((data) => data.add_play(id))
    methods.save()
    page.refresh()
  },
  addSkip: (id: TrackID) => {
    call((data) => data.add_skip(id))
    methods.save()
    page.refresh()
  },
  addPlayTime: (id: TrackID, startTime: MsSinceUnixEpoch, durationMs: number) => {
    call((data) => data.add_play_time(id, startTime, durationMs))
    methods.save()
    page.refresh()
  },
  readCoverAsync: (id: TrackID) => data.read_cover_async(id),
  updateTrackInfo: (id: TrackID, md: TrackMD) => {
    call((data) => data.update_track_info(id, JSON.stringify(md)))
    methods.save()
    softRefreshPage.refresh()
  },
}

export const filter = (() => {
  const store = writable('')
  return {
    subscribe: store.subscribe,
    set: (query: string) => {
      call((data) => data.filter_open_playlist(query))
      store.set(query)
      page.setGet()
    },
  }
})()
export const softRefreshPage = (() => {
  const store = writable(0)
  return {
    subscribe: store.subscribe,
    refresh() {
      call((data) => data.refresh_page())
      store.update((n) => n + 1)
    },
  }
})()
export const page = (() => {
  function get() {
    const info = call((data) => data.get_page_info())
    return info
  }

  const { subscribe, set, update } = writable(get())
  return {
    subscribe,
    refresh: () => {
      call((data) => data.refresh_page())
      set(get())
    },
    setGet: () => {
      set(get())
    },
    openPlaylist: (id: string) => {
      call((data) => data.open_playlist(id))
      set(get())
      filter.set('')
    },
    sortBy: (key: string) => {
      call((data) => data.sort(key, true))
      set(get())
    },
    filter: (query: string) => {
      call((data) => data.filter_open_playlist(query))
      set(get())
    },
    getTrack: (index: number): Track => {
      return call((data) => data.get_page_track(index))
    },
    getTrackId: (index: number) => {
      return call((data) => data.get_page_track_id(index))
    },
    getTrackIds: () => {
      return call((data) => data.get_page_track_ids())
    },
    moveTracks: (indexes: number[], toIndex: number) => {
      const newSelection = call((data) => data.move_tracks(indexes, toIndex))
      call((data) => data.refresh_page())
      set(get())
      methods.save()
      return newSelection
    },
  }
})()
