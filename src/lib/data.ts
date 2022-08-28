import { writable } from 'svelte/store'
import type {
  MsSinceUnixEpoch,
  Track,
  Image,
  TrackID,
  TrackList,
  TrackListID,
  TrackListsHashMap,
} from './libraryTypes'
import { showMessageBox, addon } from './window'

type PageInfo = {
  id: TrackListID
  tracklist: TrackList
  sort_key: string
  sort_desc: boolean
  length: number
}

export const isDev = process.env.NODE_ENV === 'development'
export const isMac = process.platform === 'darwin'
export type Data = {
  get_paths: () => {
    library_dir: string
    tracks_dir: string
    library_json: string
  }
  save: () => void

  import_track: (path: string, now: MsSinceUnixEpoch) => void
  get_track: (id: TrackID) => Track
  add_play: (id: TrackID) => void
  add_skip: (id: TrackID) => void
  add_play_time: (id: TrackID, startTime: MsSinceUnixEpoch, duration_ms: number) => void
  read_cover_async: (id: TrackID) => Promise<ArrayBuffer>
  update_track_info: (id: TrackID, md: string) => void
  load_tags: (id: TrackID) => void
  get_image: (index: number) => Image
  set_image: (index: number, path: string) => void
  remove_image: (index: number) => void

  get_track_lists: () => TrackListsHashMap
  add_tracks_to_playlist: (playlistId: TrackListID, trackIds: TrackID[]) => void
  remove_from_open_playlist: (indexes: number[]) => void
  delete_tracks_in_open: (indexes: number[]) => void
  new_playlist: (name: string, description: string, isFolder: boolean, parentId: string) => void
  move_playlist: (id: string, fromParent: string, toParent: string) => void

  refresh_page: () => void
  open_playlist: (id: TrackListID) => void
  get_page_track_ids: () => TrackID[]
  filter_open_playlist: (query: string) => TrackID[]
  get_page_track: (index: number) => Track
  get_page_track_id: (index: number) => string
  get_page_info: () => PageInfo
  sort: (key: string, keep_filter: boolean) => void
  move_tracks: (indexes: number[], to_index: number) => { from: number; to: number }

  shown_playlist_folders: () => string[]
  view_folder_set_show: (id: string, show: boolean) => void
}

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const obj = err as { [key: string]: unknown }
    if (obj.message) {
      return String(obj.message)
    } else if (obj.code) {
      return 'Code: ' + String(obj.message)
    }
  }
  return 'No reason or code provided'
}
function getErrorStack(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const obj = err as { [key: string]: unknown }
    if (obj.stack) {
      return String(obj.stack)
    }
  }
  return ''
}

function runWrapped<T>(cb: () => T): T {
  try {
    return cb()
  } catch (err) {
    showMessageBox({
      type: 'error',
      message: getErrorMessage(err),
      detail: getErrorStack(err),
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
    showMessageBox({
      type: 'error',
      message: getErrorMessage(err),
      detail: getErrorStack(err),
    })
    throw err
  }
}

export const trackLists = (() => {
  const initial = call((data) => data.get_track_lists())
  const { subscribe, set } = writable(initial)
  return {
    subscribe,
    refresh() {
      set(call((data) => data.get_track_lists()))
    },
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
export function deleteTracksInOpen(indexes: number[]) {
  call((data) => data.delete_tracks_in_open(indexes))
  page.refresh()
  methods.save()
}
export type PlaylistInfo = {
  parentId: string
  name: string
  description: string
}
export function newPlaylist(info: PlaylistInfo, isFolder: boolean) {
  call((data) => data.new_playlist(info.name, info.description, isFolder, info.parentId))
  methods.save()
  trackLists.refresh()
}
export function movePlaylist(id: TrackListID, fromParent: TrackListID, toParent: TrackListID) {
  call((data) => data.move_playlist(id, fromParent, toParent))
  methods.save()
  trackLists.refresh()
}

export const paths = (() => {
  return call((data) => data.get_paths())
})()

export async function importTracks(paths: string[]) {
  let errState = null
  const now = Date.now()
  for (const path of paths) {
    try {
      data.import_track(path, now)
    } catch (err) {
      if (errState === 'skip') continue
      const result = await showMessageBox({
        type: 'error',
        message: 'Error importing track ' + path,
        detail: getErrorMessage(err),
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

export type TrackMD = {
  name: string
  artist: string
  albumName: string
  albumArtist: string
  composer: string
  grouping: string
  genre: string
  year: string
  trackNum: string
  trackCount: string
  discNum: string
  discCount: string
  bpm: string
  // compilation: string
  // rating: string
  // liked: string
  // playCount: string
  comments: string
}

export const methods = {
  importTrack: (path: string, now: MsSinceUnixEpoch) => {
    call((data) => data.import_track(path, now))
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
  loadTags: (id: TrackID) => {
    call((data) => data.load_tags(id))
  },
  getImage: (index: number) => {
    return call((data) => data.get_image(index))
  },
  setImage: (index: number, path: string) => {
    return call((data) => data.set_image(index, path))
  },
  removeImage: (index: number) => {
    return call((data) => data.remove_image(index))
  },
  shownPlaylistFolders: () => {
    return call((data) => data.shown_playlist_folders())
  },
  viewFolderSetShow: (id: string, show: boolean) => {
    return call((data) => data.view_folder_set_show(id, show))
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
      store.update((n) => n + 1)
    },
  }
})()
export const page = (() => {
  function get() {
    const info = call((data) => data.get_page_info())
    return info
  }

  const { subscribe, set } = writable(get())
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
