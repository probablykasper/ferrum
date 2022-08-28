import { trackLists as trackListsStore } from '@/lib/data'
import { flattenChildLists } from '@/lib/helpers'
import { ipcRenderer } from '@/lib/window'
import type { Special } from '@/lib/libraryTypes'
import { get } from 'svelte/store'

export async function showTrackMenu(playlist = false) {
  const trackLists = get(trackListsStore)
  const flat = flattenChildLists(trackLists.root as Special, trackLists, '', 'add-to-')

  const clickedId = await ipcRenderer.invoke('showTrackMenu', flat, playlist)

  return clickedId
}
