import {
  addTracksToPlaylist,
  methods,
  paths,
  removeFromOpenPlaylist,
  trackLists as trackListsStore,
} from '@/lib/data'
import { flattenChildLists } from '@/lib/helpers'
import { ipcRenderer } from '@/lib/window'
import type { Special, TrackID } from 'ferrum-addon'
import { get } from 'svelte/store'
import { appendToUserQueue, prependToUserQueue } from './queue'
import type { ShowTrackMenuOptions } from '@/electron/typed_ipc'

export async function showTrackMenu(
  allIds: string[],
  selectedIndexes: number[],
  playlist?: { editable: boolean },
  queue = false
) {
  const trackLists = get(trackListsStore)
  const flat = flattenChildLists(trackLists.root as Special, trackLists, '')
  const args: ShowTrackMenuOptions = {
    allIds,
    selectedIndexes,
    playlist,
    queue,
    lists: flat,
  }

  await ipcRenderer.invoke('showTrackMenu', args)
}

ipcRenderer.on('context.Play Next', (e, ids: TrackID[]) => {
  prependToUserQueue(ids)
})
ipcRenderer.on('context.Add to Queue', (e, ids: TrackID[]) => {
  appendToUserQueue(ids)
})
ipcRenderer.on('context.Add to Playlist', (e, id: TrackID, trackIds: TrackID[]) => {
  addTracksToPlaylist(id, trackIds)
})
ipcRenderer.on('context.revealTrackFile', (e, id: TrackID) => {
  const track = methods.getTrack(id)
  console.log('revealTrackFile', paths.tracksDir, track.file)

  ipcRenderer.invoke('revealTrackFile', paths.tracksDir, track.file)
})
ipcRenderer.on('context.Remove from Playlist', (e, indexes: number[]) => {
  removeFromOpenPlaylist(indexes)
})
