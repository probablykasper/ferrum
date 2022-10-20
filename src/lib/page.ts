import { get, writable } from 'svelte/store'
import { page } from './data'
import { showTrackMenu } from './menus'
import { newSelection } from './selection'

export const scrollToIndex = writable(null as number | null)

export const selection = newSelection({
  getItemCount: () => get(page).length,
  scrollToItem: (i) => scrollToIndex.set(i),
  onContextMenu: async () => {
    const indexes = selection.getSelectedIndexes()
    const ids = page.getTrackIds()
    await showTrackMenu(ids, indexes, { editable: get(page).tracklist.type === 'playlist' })
  },
})
