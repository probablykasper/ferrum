import { writable } from 'svelte/store'
import { ipcRenderer } from '@/lib/window'
import type { MsSinceUnixEpoch, TrackID, TrackListID, TrackMd } from 'ferrum-addon'

export const isDev = window.isDev
export const isMac = window.isMac
export const isWindows = window.isWindows
const innerAddon = window.addon

call((addon) => addon.load_data(isDev))

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

export function call<T>(cb: (addon: typeof innerAddon) => T): T {
  try {
    return cb(innerAddon)
  } catch (err) {
    ipcRenderer.invoke('showMessageBox', false, {
      type: 'error',
      message: getErrorMessage(err),
      detail: getErrorStack(err),
    })
    throw err
  }
}

export const trackLists = (() => {
  const initial = call((addon) => addon.get_track_lists())
  const { subscribe, set } = writable(initial)
  return {
    subscribe,
    refreshTrackIdList() {
      set(call((addon) => addon.get_track_lists()))
    },
  }
})()
export async function addTracksToPlaylist(
  playlistId: TrackListID,
  trackIds: TrackID[],
  checkDuplicates = true
) {
  if (checkDuplicates) {
    const filteredIds = call((addon) => addon.playlist_filter_duplicates(playlistId, trackIds))
    const duplicates = trackIds.length - filteredIds.length

    if (duplicates > 0) {
      const result = await ipcRenderer.invoke('showMessageBox', false, {
        type: 'question',
        message: 'Already added',
        detail:
          duplicates > 1
            ? `${duplicates} songs are already in this playlist`
            : `${duplicates} song is already in this playlist`,
        buttons: ['Add anyway', 'Cancel', 'Skip'],
        defaultId: 0,
      })
      if (result.response === 1) {
        return
      } else if (result.response === 2) {
        trackIds = filteredIds
      }
    }
  }
  if (trackIds.length >= 1) {
    call((addon) => addon.add_tracks_to_playlist(playlistId, trackIds))
    if (page.get().tracklist.id === playlistId) {
      page.refresh()
    }
    methods.save()
  }
}
export function removeFromOpenPlaylist(indexes: number[]) {
  call((addon) => addon.remove_from_open_playlist(indexes))
  page.refresh()
  methods.save()
}
export function deleteTracksInOpen(indexes: number[]) {
  call((addon) => addon.delete_tracks_in_open(indexes))
  page.refresh()
  methods.save()
}
export type PlaylistInfo = {
  name: string
  description: string
  isFolder: boolean
  /** ID to edit, or ID to create playlist inside */
  id: string
  editMode: boolean
}
export function newPlaylist(info: PlaylistInfo) {
  call((addon) => addon.new_playlist(info.name, info.description, info.isFolder, info.id))
  methods.save()
  trackLists.refreshTrackIdList()
}
export function updatePlaylist(id: string, name: string, description: string) {
  call((addon) => addon.update_playlist(id, name, description))
  methods.save()
  trackLists.refreshTrackIdList()
  softRefreshPage.refresh()
}
export function movePlaylist(id: TrackListID, fromParent: TrackListID, toParent: TrackListID) {
  call((addon) => addon.move_playlist(id, fromParent, toParent))
  methods.save()
  trackLists.refreshTrackIdList()
}
export function importItunes(path: string) {
  return call((addon) => addon.import_itunes(path, paths.tracksDir))
}

export const paths = call((addon) => addon.get_paths())

export async function importTracks(paths: string[]) {
  let errState = null
  const now = Date.now()
  for (const path of paths) {
    try {
      innerAddon.import_file(path, now)
    } catch (err) {
      if (errState === 'skip') continue
      const result = await ipcRenderer.invoke('showMessageBox', false, {
        type: 'error',
        message: 'Error importing track ' + path,
        detail: getErrorMessage(err),
        buttons: errState ? ['OK', 'Skip all errors'] : ['OK'],
        defaultId: 0,
      })
      if (result.response === 1) errState = 'skip'
      else errState = 'skippable'
    }
  }
  methods.save()
  page.refresh()
}

export const methods = {
  importTrack: (path: string, now: MsSinceUnixEpoch) => {
    call((data) => data.import_file(path, now))
  },
  getTrack: (id: TrackID) => {
    return call((data) => data.get_track(id))
  },
  save: () => {
    return call((addon) => addon.save())
  },
  addPlay: (id: TrackID) => {
    call((data) => data.add_play(id))
    methods.save()
    softRefreshPage.refresh()
  },
  addSkip: (id: TrackID) => {
    call((data) => data.add_skip(id))
    methods.save()
    softRefreshPage.refresh()
  },
  addPlayTime: (id: TrackID, startTime: MsSinceUnixEpoch, durationMs: number) => {
    call((data) => data.add_play_time(id, startTime, durationMs))
    methods.save()
    softRefreshPage.refresh()
  },
  readCoverAsync: (id: TrackID) => innerAddon.read_cover_async(id),
  updateTrackInfo: (id: TrackID, md: TrackMd) => {
    call((data) => data.update_track_info(id, md))
    methods.save()
    softRefreshPage.refresh()
    refreshTrackInfo.refresh()
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
  setImageData: (index: number, bytes: ArrayBuffer, mime_type: string) => {
    return call((data) => data.set_image_data(index, bytes, mime_type))
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
function createRefreshStore() {
  const store = writable(0)
  return {
    subscribe: store.subscribe,
    refresh() {
      store.update((n) => n + 1)
    },
  }
}
export const softRefreshPage = createRefreshStore()
export const refreshTrackInfo = createRefreshStore()
export const page = (() => {
  function get() {
    const info = call((addon) => addon.get_page_info())
    return info
  }

  const { subscribe, set } = writable(get())
  return {
    subscribe,
    get,
    refresh: () => {
      call((addon) => addon.refresh_page())
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
      call((addon) => addon.sort(key, true))
      set(get())
    },
    filter: (query: string) => {
      call((data) => data.filter_open_playlist(query))
      set(get())
    },
    getTrack: (index: number) => {
      return call((addon) => addon.get_page_track(index))
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
