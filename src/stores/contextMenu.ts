import { ipcRenderer } from './window'
import type { TrackID } from './libraryTypes'
import { appendToUserQueue, prependToUserQueue } from './queue'

export async function showTrackMenu(ids: TrackID[]) {
  const clickedId = await ipcRenderer.invoke('showTrackMenu')
  if (clickedId === null) return
  if (clickedId === 'Add to Queue') {
    appendToUserQueue(ids)
  } else if (clickedId === 'Play Next') {
    prependToUserQueue(ids)
  } else {
    console.error('Unknown contextMenu ID', clickedId)
  }
}
