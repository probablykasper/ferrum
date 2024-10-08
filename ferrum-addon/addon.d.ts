/* tslint:disable */
/* eslint-disable */

/* auto-generated by NAPI-RS */

export declare function get_artists(): Array<string>
export declare function load_data(isDev: boolean, localDataPath?: string | undefined | null, libraryPath?: string | undefined | null): void
export interface PathsJs {
  libraryDir: string
  tracksDir: string
  libraryJson: string
  cacheDb: string
  localDataDir: string
}
export declare function get_paths(): PathsJs
export declare function save(): void
export interface ImportStatus {
  errors: Array<string>
  tracksCount: number
  playlistsCount: number
}
export declare function get_default_sort_desc(field: string): boolean
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
  tracks: Array<ItemId>
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
export interface TracksPageOptions {
  playlistId: string
  sortKey: string
  sortDesc: boolean
  filterQuery: string
  groupAlbumTracks: boolean
}
export interface TracksPage {
  playlistKind: string
  playlistName: string
  playlistDescription?: string
  playlistLength: number
  itemIds: Array<ItemId>
}
export declare function get_tracks_page(options: TracksPageOptions): TracksPage
export interface TrackListDetails {
  id: string
  name: string
  kind: string
  /** Folders only */
  children?: Array<string>
}
export declare function get_track_lists_details(): Record<string, TrackListDetails>
export declare function get_track_list(id: string): TrackList
/** Returns the deleted track lists, including folder children */
export declare function delete_track_list(id: string): void
export declare function add_tracks_to_playlist(playlistId: string, trackIds: Array<string>): void
export declare function playlist_filter_duplicates(playlistId: TrackID, ids: Array<string>): Array<TrackID>
export declare function remove_from_playlist(playlistId: TrackID, itemIds: Array<ItemId>): void
export declare function delete_tracks_with_item_ids(itemIds: Array<ItemId>): void
export declare function new_playlist(name: string, description: string, isFolder: boolean, parentId: string): void
export declare function update_playlist(id: string, name: string, description: string): void
export declare function move_playlist(id: string, fromId: string, toId: string, toIndex: number): void
export declare function move_tracks(playlistId: string, itemIds: Array<ItemId>, toIndex: number): void
/** Returns `None` if the file does not have an image */
export declare function read_small_cover_async(path: string, index: number, cacheDbPath: string): Promise<Buffer | null>
export declare function read_cover_async(trackId: string, index: number): Promise<ArrayBuffer | null>
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
export declare function get_track(id: string): Track
export interface KeyedTrack {
  id: TrackID
  track: Track
}
export declare function get_track_by_item_id(itemId: ItemId): KeyedTrack
export declare function get_track_ids(itemIds: Array<ItemId>): Array<TrackID>
export declare function track_exists(id: string): boolean
export declare function add_play(trackId: string): void
export declare function add_skip(trackId: string): void
export declare function add_play_time(id: TrackID, start: MsSinceUnixEpoch, durMs: number): void
export declare function import_file(path: string, now: MsSinceUnixEpoch): void
export declare function load_tags(trackId: string): void
export interface JsImage {
  index: number
  totalImages: number
  mimeType: string
  data: Buffer
}
export declare function get_image(index: number): JsImage | null
export declare function set_image(index: number, pathStr: string): void
export declare function set_image_data(index: number, bytes: ArrayBuffer): void
export declare function remove_image(index: number): void
export declare function update_track_info(trackId: string, info: TrackMd): void
export interface ViewOptions {
  shownPlaylistFolders: Array<string>
  /** Empty is treated as default */
  columns: Array<string>
  /** Auto update checking */
  noAutoUpdate: boolean
  skipUpdatingToVersion?: string
}
export declare function load_view_options(): ViewOptions
export declare function save_view_options(viewOptions: ViewOptions): void
export declare class ItunesImport {
  static new(): ItunesImport
  start(path: string, tracksDir: string): Promise<ImportStatus>
  finish(): void
}
