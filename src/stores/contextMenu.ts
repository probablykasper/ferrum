import { ipcRenderer } from './window'
import queue from './queue'

export async function showTrackMenu(id: string) {
  const clickedId = await ipcRenderer.invoke('showTrackMenu')
  if (clickedId === null) return
  if (clickedId === 'Add to Queue') {
    queue.appendToUserQueue([id])
  } else if (clickedId === 'Play Next') {
    queue.prependToUserQueue([id])
  } else {
    console.error('Unknown contextMenu ID', clickedId)
  }
}
