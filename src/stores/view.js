import { writable, derived } from 'svelte/store'
import { tracks as libTracks, trackLists } from './library.js'

export const openPlaylist = writable('root')

export const trackIds = derived(
  [trackLists, openPlaylist, libTracks],
  ([$trackLists, $openPlaylist, $libTracks]) => {
    const trackList = $trackLists[$openPlaylist]
    let ids = []
    if (trackList.type === 'playlist') {
      ids = trackList.tracks
    } else if (trackList.type === 'special') {
      for (const key in $libTracks) {
        if (!Object.hasOwnProperty.call($libTracks, key)) continue
        ids.push(key)
      }
    }
    return ids
  },
)
