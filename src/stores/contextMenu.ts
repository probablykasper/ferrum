import { ipcRenderer } from './window'
import type { TrackID, Folder, Special, TrackListsHashMap } from './libraryTypes'
import { appendToUserQueue, prependToUserQueue } from './queue'
import { trackLists as trackListsStore, addTracksToPlaylist, removeFromOpenPlaylist } from './data'

function flattenChildLists(
  trackList: Folder | Special,
  trackLists: TrackListsHashMap,
  prefix: string,
  idPrefix: string
) {
  type Item = { label: string; enabled: boolean; id?: string }
  let flat: Item[] = []
  for (const childListId of trackList.children) {
    const childList = trackLists[childListId]
    if (childList.type === 'folder') {
      const childFlat = flattenChildLists(childList, trackLists, prefix + '   ', idPrefix)
      flat.push({
        label: prefix + childList.name,
        enabled: false,
      })
      flat = flat.concat(childFlat)
    } else if (childList.type === 'playlist') {
      flat.push({
        label: prefix + childList.name,
        enabled: true,
        id: idPrefix + childList.id,
      })
    }
  }
  return flat
}

export async function showTrackMenu(ids: TrackID[], indexes: number[]) {
  const trackLists = trackListsStore.getOnce()
  const flat = flattenChildLists(trackLists.root as Special, trackLists, '', 'add-to-')

  const clickedId = await ipcRenderer.invoke('showTrackMenu', flat)
  if (clickedId === null) return
  if (clickedId === 'Add to Queue') {
    appendToUserQueue(ids)
  } else if (clickedId === 'Play Next') {
    prependToUserQueue(ids)
  } else if (clickedId.startsWith('add-to-')) {
    const pId = clickedId.substring('add-to-'.length)
    addTracksToPlaylist(pId, ids)
  } else if (clickedId === 'Remove from Playlist') {
    removeFromOpenPlaylist(indexes)
  } else {
    console.error('Unknown contextMenu ID', clickedId)
  }
}
