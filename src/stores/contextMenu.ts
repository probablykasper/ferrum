import { ipcRenderer } from './window'
import { appendToUserQueue, prependToUserQueue } from './queue'

export async function showTrackMenu(id: string) {
  const clickedId = await ipcRenderer.invoke('showTrackMenu')
  if (clickedId === null) return
  if (clickedId === 'Add to Queue') {
    appendToUserQueue([id])
  } else if (clickedId === 'Play Next') {
    prependToUserQueue([id])
  } else {
    console.error('Unknown contextMenu ID', clickedId)
  }
}
