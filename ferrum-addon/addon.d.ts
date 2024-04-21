/* tslint:disable */
/* eslint-disable */

/* auto-generated by NAPI-RS */

export function load_data(isDev: boolean): void
export interface PathsJs {
  libraryDir: string
  tracksDir: string
  libraryJson: string
  localDataDir: string
}
export function get_paths(): PathsJs
export function save(): void
export function filter_open_playlist(query: string): void
export interface ImportStatus {
  errors: Array<string>
  tracksCount: number
  playlistsCount: number
}
export function copyFile(from: string, to: string): void
export function atomicFileSave(filePath: string, content: string): void
export interface Track {
  size: number
  duration: number
  bitrate: number
  sampleRate: number
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
  plays?: Array<MsSinceUnixEpoch>
  playsImported?: Array<CountObject>
  skipCount?: number
  skips?: Array<MsSinceUnixEpoch>
  skipsImported?: Array<CountObject>
  /** -100 to 100 */
  volume?: number
}
export interface CountObject {
  count: number
  fromDate: MsSinceUnixEpoch
  toDate: MsSinceUnixEpoch
}
export interface Playlist {
  id: TrackListID
  name: string
  description?: string
  liked: boolean
  disliked: boolean
  importedFrom?: string
  originalId?: string
  dateImported?: MsSinceUnixEpoch
  dateCreated?: MsSinceUnixEpoch
  tracks: Array<TrackID>
}
export interface Folder {
  id: TrackListID
  name: string
  description?: string
  liked: boolean
  disliked: boolean
  /** For example "itunes" */
  importedFrom?: string
  /** For example iTunes Persistent ID */
  originalId?: string
  dateImported?: MsSinceUnixEpoch
  dateCreated?: MsSinceUnixEpoch
  children: Array<TrackListID>
}
export interface Special {
  id: TrackListID
  name: SpecialTrackListName
  dateCreated: MsSinceUnixEpoch
  children: Array<TrackListID>
}
export const enum SpecialTrackListName {
  Root = 0
}
export function open_playlist(openPlaylistId: string): void
export function get_page_track(index: number): Track
export function get_page_track_id(index: number): string
export function refresh_page(): void
export function get_page_track_ids(): Array<TrackID>
export interface PageInfo {
  id: string
  tracklist: TrackList
  sortKey: string
  sortDesc: boolean
  length: number
}
export function get_page_info(): PageInfo
export function sort(sortKey: string, keepFilter: boolean): void
export interface SelectionInfo {
  from: number
  to: number
}
export function move_tracks(indexesToMove: Array<number>, toIndex: number): SelectionInfo
export interface TrackListDetails {
  id: string
  name: string
  kind: string
  /** Folders only */
  children?: Array<string>
}
export function get_track_lists_details(): Record<string, TrackListDetails>
export function get_track_list(id: string): TrackList
/** Returns the deleted track lists, including folder children */
export function delete_track_list(id: string): void
export function add_tracks_to_playlist(playlistId: string, trackIds: Array<string>): void
export function playlist_filter_duplicates(playlistId: string, ids: Array<string>): Array<TrackID>
export function remove_from_open_playlist(indexesToRemove: Array<number>): void
export function delete_tracks_in_open(indexesToDelete: Array<number>): void
export function new_playlist(name: string, description: string, isFolder: boolean, parentId: string): void
export function update_playlist(id: string, name: string, description: string): void
export function move_playlist(id: string, fromId: string, toId: string, toIndex: number): void
export function shown_playlist_folders(): Array<string>
export function view_folder_set_show(id: string, show: boolean): void
export interface TrackMd {
  name: string
  artist: string
  albumName: string
  albumArtist: string
  composer: string
  grouping: string
  genre: string
  year: string
  trackNum: string
  trackCount: string
  discNum: string
  discCount: string
  bpm: string
  comments: string
}
export function get_track(id: string): Track
export function track_exists(id: string): boolean
export function add_play(trackId: string): void
export function add_skip(trackId: string): void
export function add_play_time(id: TrackID, start: MsSinceUnixEpoch, durMs: number): void
export function read_cover_async(trackId: string, index: number): Promise<ArrayBuffer>
export function read_cover_async_path(path: string, index: number): Promise<ArrayBuffer>
export function import_file(path: string, now: MsSinceUnixEpoch): void
export function load_tags(trackId: string): void
export interface JsImage {
  index: number
  totalImages: number
  mimeType: string
  data: Buffer
}
export function get_image(index: number): JsImage | null
export function set_image(index: number, pathStr: string): void
export function set_image_data(index: number, bytes: ArrayBuffer, mimeType: string): void
export function remove_image(index: number): void
export function update_track_info(trackId: string, info: TrackMd): void
export class ItunesImport {
  static new(): ItunesImport
  start(path: string, tracksDir: string): Promise<ImportStatus>
  finish(): void
}
