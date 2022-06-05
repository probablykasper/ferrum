export type Library = {
  version: Version
  playTime: PlayTime[]
  tracks: TracksHashMap
  trackLists: TrackListsHashMap
}

export type TrackID = string
export type TrackListID = string
export type MsSinceUnixEpoch = number
/** Should be 0-100 */
export type PercentInteger = number
export interface TrackListsHashMap {
  root: Special
  [TrackListID: string]: TrackList
}

export enum Version {
  V1 = 1,
}

/** (track id, start time, duration) */
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
  name: string
  importedFrom?: string
  /** Imported ID, like iTunes Persistent ID */
  originalId?: string
  artist: string
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

export type Image = {
  index: number
  total_images: number
  mime_type: string
  data: string
}

export type CountObject = {
  count: number
  fromDate: MsSinceUnixEpoch
  toDate: MsSinceUnixEpoch
}

export type TrackList = Playlist | Folder | Special

export type Playlist = {
  type: 'playlist'
  id: TrackListID
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

export type Folder = {
  type: 'folder'
  id: TrackListID
  show: boolean
  name: string
  description?: string
  liked?: string
  disliked?: string
  /** For example "itunes" */
  importedFrom?: string
  /** For example iTunes Persistent ID */
  originalId?: string
  dateImported?: MsSinceUnixEpoch
  dateCreated?: MsSinceUnixEpoch
  children: TrackListID[]
}

export type Special = {
  type: 'special'
  id: TrackListID
  name: SpecialTrackListName
  dateCreated: MsSinceUnixEpoch
  children: TrackListID[]
}

enum SpecialTrackListName {
  Root,
}
