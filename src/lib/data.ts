import { writable } from 'svelte/store'
import { ipcRenderer } from '@/lib/window'
import type {
  MsSinceUnixEpoch,
  TrackID,
  TrackList,
  TrackListID,
  TrackMd,
  Size,
} from '../../ferrum-addon'
import { selection as pageSelection } from './page'
import { queue } from './queue'

export const isDev = window.isDev
export const isMac = window.isMac
export const isWindows = window.isWindows
const innerAddon = window.addon
export const ItunesImport = innerAddon.ItunesImport

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
function errorPopup(err: unknown) {
  ipcRenderer.invoke('showMessageBox', false, {
    type: 'error',
    message: getErrorMessage(err),
    detail: getErrorStack(err),
  })
}

export function call<T, P extends T | Promise<T>>(cb: (addon: typeof innerAddon) => P): P {
  try {
    const result = cb(innerAddon)
    if (result instanceof Promise) {
      return result.catch((err) => {
        errorPopup(err)
        throw err
      }) as P
    } else {
      return result
    }
  } catch (err) {
    console.log('errorPopup')

    errorPopup(err)
    throw err
  }
}

export const trackListsDetailsMap = (() => {
  const initial = call((addon) => addon.get_track_lists_details())

  const { subscribe, set } = writable(initial)
  return {
    subscribe,
    refresh() {
      set(call((addon) => addon.get_track_lists_details()))
    },
  }
})()
export async function addTracksToPlaylist(
  playlistId: TrackListID,
  trackIds: TrackID[],
  checkDuplicates = true,
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
      page.refreshIdsAndKeepSelection()
    }
    methods.save()
  }
}
export function removeFromOpenPlaylist(indexes: number[]) {
  call((addon) => addon.remove_from_open_playlist(indexes))
  page.refreshIdsAndKeepSelection()
  pageSelection.clear()
  methods.save()
}
export function deleteTracksInOpen(indexes: number[]) {
  call((addon) => addon.delete_tracks_in_open(indexes))
  page.refreshIdsAndKeepSelection()
  pageSelection.clear()
  queue.removeDeleted()
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
  trackListsDetailsMap.refresh()
  methods.save()
}
export function updatePlaylist(id: string, name: string, description: string) {
  call((addon) => addon.update_playlist(id, name, description))
  trackListsDetailsMap.refresh()
  page.refreshIdsAndKeepSelection()
  methods.save()
}
export function movePlaylist(
  id: TrackListID,
  fromParent: TrackListID,
  toParent: TrackListID,
  toIndex: number,
) {
  call((addon) => addon.move_playlist(id, fromParent, toParent, toIndex))
  trackListsDetailsMap.refresh()
  methods.save()
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
  page.refreshIdsAndKeepSelection()
  pageSelection.clear()
  methods.save()
}

export const methods = {
  importTrack: (path: string, now: MsSinceUnixEpoch) => {
    call((data) => data.import_file(path, now))
  },
  getTrack: (id: TrackID) => {
    return call((data) => data.get_track(id))
  },
  trackExists: (id: TrackID) => {
    return call((data) => data.track_exists(id))
  },
  getTrackList: (id: TrackListID) => {
    return call((data) => data.get_track_list(id)) as TrackList
  },
  deleteTrackList: (id: TrackListID) => {
    call((data) => data.delete_track_list(id))
    page.refreshIdsAndKeepSelection()
    pageSelection.clear()
    trackListsDetailsMap.refresh()
    methods.save()
  },
  save: () => {
    return call((addon) => addon.save())
  },
  addPlay: (id: TrackID) => {
    call((data) => data.add_play(id))
    page.refreshIdsAndKeepSelection()
    methods.save()
  },
  addSkip: (id: TrackID) => {
    call((data) => data.add_skip(id))
    page.refreshIdsAndKeepSelection()
    methods.save()
  },
  addPlayTime: (id: TrackID, startTime: MsSinceUnixEpoch, durationMs: number) => {
    call((data) => data.add_play_time(id, startTime, durationMs))
    page.refreshIdsAndKeepSelection()
    methods.save()
  },
  readCoverAsync(id: TrackID, index: number) {
    return innerAddon.read_cover_async(id, index).catch((error) => {
      console.log('Could not read cover', error)
      throw error
    })
  },
  updateTrackInfo: (id: TrackID, md: TrackMd) => {
    call((data) => data.update_track_info(id, md))
    trackMetadataUpdated.emit()
    page.refreshIdsAndKeepSelection()
    methods.save()
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
  const { subscribe, set } = writable('')
  return {
    subscribe: subscribe,
    set: (query: string) => {
      call((data) => data.filter_open_playlist(query))
      page.set(page.get())
      pageSelection.clear()
      set(query)
    },
  }
})()

function createRefreshStore() {
  const store = writable(0)
  return {
    subscribe: store.subscribe,
    emit() {
      store.update((n) => n + 1)
    },
  }
}
export const trackMetadataUpdated = createRefreshStore()

export const page = (() => {
  function get() {
    const info = call((addon) => addon.get_page_info())
    return info
  }
  function refreshIdsAndKeepSelection() {
    call((addon) => addon.refresh_page())
    set(get())
  }

  const { subscribe, set, update } = writable(get())
  return {
    subscribe,
    get,
    set,
    update,
    refreshIdsAndKeepSelection,
    openPlaylist: (id: string) => {
      call((data) => data.open_playlist(id))
      refreshIdsAndKeepSelection()
      pageSelection.clear()
      filter.set('')
    },
    sortBy: (key: string) => {
      call((addon) => addon.sort(key, true))
      refreshIdsAndKeepSelection()
      pageSelection.clear()
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
      refreshIdsAndKeepSelection()
      pageSelection.clear()
      for (let i = newSelection.from; i <= newSelection.to; i++) {
        pageSelection.add(i)
      }
      methods.save()
    },
  }
})()
