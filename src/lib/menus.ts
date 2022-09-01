import {
  addTracksToPlaylist,
  methods,
  page,
  paths,
  removeFromOpenPlaylist,
  trackLists as trackListsStore,
} from '@/lib/data'
import { open as openTrackInfo } from '@/components/TrackInfo.svelte'
import { flattenChildLists } from '@/lib/helpers'
import { ipcRenderer } from '@/lib/window'
import type { Special } from '@/lib/libraryTypes'
import { get } from 'svelte/store'
import type { ShowTracklistMenuArgs, ShowTrackMenuArgs } from '@/electron/types'
import { appendToUserQueue, prependToUserQueue } from './queue'
import {
  edit as openEditPlaylistModal,
  openNew as openNewPlaylistModal,
} from '@/components/PlaylistInfo.svelte'

export async function showTrackMenu(
  ids: string[],
  playlist?: { indexes: number[]; editable: boolean }
) {
  const trackLists = get(trackListsStore)
  const flat = flattenChildLists(trackLists.root as Special, trackLists, '', 'add-to-')
  const args: ShowTrackMenuArgs = { ids, playlist, lists: flat }

  await ipcRenderer.invoke('showTrackMenu', args)
}

ipcRenderer.on('context.Play Next', (e, ids: string[]) => {
  prependToUserQueue(ids)
})
ipcRenderer.on('context.Add to Queue', (e, ids: string[]) => {
  appendToUserQueue(ids)
})
ipcRenderer.on('context.Add to Playlist', (e, id: string, trackIds: string[]) => {
  addTracksToPlaylist(id, trackIds)
})
ipcRenderer.on('context.Get Info', (e, ids: string[] | null, trackIndex: number) => {
  openTrackInfo(ids || page.getTrackIds(), trackIndex)
})
ipcRenderer.on('context.revealTrackFile', (e, id: string) => {
  const track = methods.getTrack(id)
  ipcRenderer.invoke('revealTrackFile', paths.tracks_dir, track.file)
})
ipcRenderer.on('context.Remove from Playlist', (e, indexes: number[]) => {
  removeFromOpenPlaylist(indexes)
})

export async function showTracklistMenu(args: ShowTracklistMenuArgs) {
  await ipcRenderer.invoke('showTracklistMenu', args)
}

ipcRenderer.on('context.playlist.edit', (e, args: ShowTracklistMenuArgs) => {
  openEditPlaylistModal(args.id, args.isFolder)
})
ipcRenderer.on('context.playlist.new', (e, args: ShowTracklistMenuArgs) => {
  openNewPlaylistModal(args.id, args.isFolder)
})
