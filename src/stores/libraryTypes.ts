export type Library = {
  version: Version
  playTime: PlayTime[]
  tracks: TracksHashMap
  trackLists: TrackListsHashMap
}

export type TrackID = string
export type TrackListID = string
export type MsSinceUnixEpoch = number
export type PercentInteger = number // should be 0-100

export enum Version {
  V1 = 1
}

export type PlayTime = [TrackID, number, number]

export interface TracksHashMap {
  [TrackID: string]: Track
}

export type Track = {
  size?: number
  duration?: number
  bitrate?: number
  sampleRate?: number
  file: string
  dateModified: MsSinceUnixEpoch
  dateAdded: MsSinceUnixEpoch
  name?: string
  importedFrom?: string
  originalId?: string // imported ID, like iTunes Persistent ID
  artist?: string
  composer?: string
  sortName?: string
  sortArtist?: string
  sortComposer?: string
  genre?: string
  rating?: PercentInteger
  year?: number
  bpm?: number
  comments?: string
  grouping?: string
  liked?: boolean
  disliked?: boolean
  disabled?: boolean
  compilation?: boolean
  albumName?: string
  albumArtist?: string
  sortAlbumName?: string
  sortAlbumArtist?: string
  trackNum?: number
  trackCount?: number
  discNum?: number
  discCount?: number
  dateImported?: MsSinceUnixEpoch
  playCount?: number
  plays?: MsSinceUnixEpoch[]
  playsImported?: CountObject[]
  skipCount?: number
  skips?: MsSinceUnixEpoch[]
  skipsImported?: CountObject[]
  volume?: PercentInteger
}

export type CountObject = {
  count: number
  fromDate: MsSinceUnixEpoch
  toDate: MsSinceUnixEpoch
}

export interface TrackListsHashMap {
  [TrackListID: string]: TrackList
}

type TrackList = Playlist | Folder | Special

type Playlist = {
  type: "playlist"
  name: string
  description?: string
  liked?: string
  disliked?: string
  importedFrom?: string
  originalId?: string
  dateImported?: MsSinceUnixEpoch
  dateCreated?: MsSinceUnixEpoch
  tracks: TrackID[]
}

type Folder = {
  type: "folder"
  name: string
  description?: string
  liked?: string
  disliked?: string
  importedFrom?: string // like "itunes"
  originalId?: string // like iTunes Persistent ID
  dateImported?: MsSinceUnixEpoch
  dateCreated?: MsSinceUnixEpoch
  children: TrackListID[]
}

type Special = {
  type: "special"
  name: SpecialTrackListName
  dateCreated: MsSinceUnixEpoch
  children: TrackListID[]
}

enum SpecialTrackListName {
  Root
}
