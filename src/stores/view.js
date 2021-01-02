import { writable, derived } from 'svelte/store'
import { tracks as libTracks, trackLists } from './library.js'

export const openPlaylist = writable('root')

function getDefaultSort(key) {
  switch(key) {
    case 'name':
    case 'artist':
    case 'composer':
    case 'albumName':
    case 'albumArtist':
    case 'sortName':
    case 'sortArtist':
    case 'sortComposer':
    case 'sortAlbumName':
    case 'sortAlbumArtist':
    case 'file':
    case 'importedFrom':
    case 'originalId':
    case 'genre':
    case 'comments':
    case 'grouping':
      // alphabetical columns should be asc (A-Z)
      return { key: key, desc: false }
    default:
      // numerical and bool columns should be desc
      return { key: key, desc: true }
  }
}
export const sort = (() => {
  const { subscribe, set, update } = writable({ key: 'index', desc: true })
  return {
    subscribe,
    toggleDirection: () => update(sort => {
      return { key: sort.key, desc: !sort.desc }
    }),
    setKey: (key, autoDirection) => update(sort => {
      if (!autoDirection) return { key: key, desc: sort.desc }
      if (sort.key === key) return { key: key, desc: !sort.desc }
      switch(key) {
        case 'name':
        case 'artist':
        case 'composer':
        case 'albumName':
        case 'albumArtist':
        case 'sortName':
        case 'sortArtist':
        case 'sortComposer':
        case 'sortAlbumName':
        case 'sortAlbumArtist':
        case 'file':
        case 'importedFrom':
        case 'originalId':
        case 'genre':
        case 'comments':
        case 'grouping':
          // alphabetical columns should be asc (A-Z)
          return { key: key, desc: false }
        default:
          // numerical and bool columns should be desc
          return { key: key, desc: true }
      }
    }),
  }
})()

const merge = (arr1, arr2, compareFunc) => {
  const sorted = []
  while (arr1.length && arr2.length) {
    if (compareFunc(arr1[0], arr2[0])) sorted.push(arr1.shift())
    else sorted.push(arr2.shift())
  }
  return sorted.concat(arr1.slice().concat(arr2.slice()))
}

const mergeSort = (arr, compareFunc) => {
  if (arr.length <= 1) return arr
  const mid = Math.floor(arr.length / 2)
  const left = mergeSort(arr.slice(0, mid), compareFunc)
  const right = mergeSort(arr.slice(mid), compareFunc)

  return merge(left, right, compareFunc)
}

export const trackIds = derived(
  [trackLists, openPlaylist, libTracks, sort],
  ([$trackLists, $openPlaylist, $libTracks, $sort]) => {
    const trackList = $trackLists[$openPlaylist]
    // get IDs
    let ids = []
    if (trackList.type === 'playlist') {
      // loop instead of assignment to avoid altering original
      for (const id of trackList.tracks) {
        ids.push(id)
      }
    } else if (trackList.type === 'special') {
      for (const key in $libTracks) {
        if (!Object.hasOwnProperty.call($libTracks, key)) continue
        ids.push(key)
      }
    }
    // sort
    const key = $sort.key
    if (key === 'index') {
      // No need to sort for index. Indexes descend from "first to last"
      // instead of "high to low", so it needs to be reversed
      if ($sort.desc) return ids
      else return ids.reverse()
    }
    const msStart = new Date().getTime()
    const values = {}
    for (const id in $libTracks) {
      const track = $libTracks[id]
      let value = track[key]
      if (key === 'name' && track['sortName']) value = track['sortName'].toLowerCase()
      else if (key === 'artist' && track['sortArtist']) value = track['sortArtist'].toLowerCase()
      else if (key === 'composer' && track['sortComposer']) value = track['sortComposer'].toLowerCase()
      else if (key === 'albumName' && track['sortAlbumName']) value = track['sortAlbumName'].toLowerCase()
      else if (key === 'albumArtist' && track['sortAlbumArtist']) value = track['sortAlbumArtist'].toLowerCase()
      else if (typeof value === 'string') value = value.toLowerCase()
      values[id] = value || ''
    }
    const sortFuncDesc = (id1, id2) => {
      return values[id1] > values[id2]
    }
    const sortFuncAsc = (id1, id2) => {
      return values[id1] < values[id2]
    }
    const sortFunc = $sort.desc ? sortFuncDesc : sortFuncAsc
    const sortedIds = mergeSort(ids, sortFunc)
    const msEnd = new Date().getTime()
    console.log(`Sort took ${msEnd - msStart}ms`)
    return sortedIds
  },
)
