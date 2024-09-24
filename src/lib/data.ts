import { writable } from 'svelte/store'
import { ipc_renderer } from '@/lib/window'
import type {
	MsSinceUnixEpoch,
	TrackID,
	TrackList,
	TrackListID,
	ItemId,
	TrackMd,
	TracksPageOptions,
	ViewAs,
	ViewOptions,
} from '../../ferrum-addon'
import { queue } from './queue'

export const is_dev = window.is_dev
export const local_data_path = window.local_data_path
export const library_path = window.library_path
export const is_mac = window.is_mac
export const is_windws = window.is_windows
const inner_addon = window.addon
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ItunesImport = inner_addon.ItunesImport

call((addon) => addon.load_data(is_dev, local_data_path, library_path))

export const view_as_songs: ViewAs.Songs = 0
export const view_as_artists: ViewAs.Artists = 1

function get_error_message(err: unknown): string {
	if (typeof err === 'object' && err !== null) {
		const obj = err as { [key: string]: unknown }
		if (obj.message) {
			return String(obj.message)
		} else if (obj.code) {
			return 'Code: ' + String(obj.message)
		}
	}
	return 'No reason or code provided'
}
function get_error_stack(err: unknown): string {
	if (typeof err === 'object' && err !== null) {
		const obj = err as { [key: string]: unknown }
		if (obj.stack) {
			return String(obj.stack)
		}
	}
	return ''
}
function error_popup(err: unknown) {
	ipc_renderer.invoke('showMessageBox', false, {
		type: 'error',
		message: get_error_message(err),
		detail: get_error_stack(err),
	})
}

export function call<T, P extends T | Promise<T>>(cb: (addon: typeof inner_addon) => P): P {
	try {
		const result = cb(inner_addon)
		if (result instanceof Promise) {
			return result.catch((err) => {
				error_popup(err)
				throw err
			}) as P
		} else {
			return result
		}
	} catch (err) {
		console.error('errorPopup:', err)
		error_popup(err)
		throw err
	}
}

export const track_lists_details_map = (() => {
	const initial = call((addon) => addon.get_track_lists_details())

	const { subscribe, set } = writable(initial)
	return {
		subscribe,
		refresh() {
			set(call((addon) => addon.get_track_lists_details()))
		},
	}
})()
export async function add_tracks_to_playlist(
	playlist_id: TrackListID,
	track_ids: TrackID[],
	check_duplicates = true,
) {
	if (check_duplicates) {
		const filtered_ids = call((addon) => addon.playlist_filter_duplicates(playlist_id, track_ids))
		const duplicates = track_ids.length - filtered_ids.length
		if (duplicates > 0) {
			const result = await ipc_renderer.invoke('showMessageBox', false, {
				type: 'question',
				message: 'Already added',
				detail:
					duplicates > 1
						? `${duplicates} songs are already in this playlist`
						: `${duplicates} song is already in this playlist`,
				buttons: ['Add anyway', 'Cancel', 'Skip'],
				defaultId: 0,
			})
			if (result.response === 1) {
				return
			} else if (result.response === 2) {
				track_ids = filtered_ids
			}
		}
	}
	if (track_ids.length >= 1) {
		call((addon) => addon.add_tracks_to_playlist(playlist_id, track_ids))
		tracklist_items_updated.emit()
		methods.save()
	}
}
export function remove_from_playlist(playlist_id: TrackListID, item_ids: ItemId[]) {
	// call((addon) => addon.remove_from_playlist(playlist_id, item_ids))
	// page.refresh_ids_and_keep_selection()
	// pageSelection.clear()
	// methods.save()
}
export function delete_tracks_with_item_ids(item_ids: ItemId[]) {
	call((addon) => addon.delete_tracks_with_item_ids(item_ids))
	tracklist_items_updated.emit()
	queue.removeDeleted()
	methods.save()
}
export type PlaylistInfo = {
	name: string
	description: string
	isFolder: boolean
	/** ID to edit, or ID to create playlist inside */
	id: string
	editMode: boolean
}
export function new_playlist(info: PlaylistInfo) {
	call((addon) => addon.new_playlist(info.name, info.description, info.isFolder, info.id))
	track_lists_details_map.refresh()
	methods.save()
}
export function update_playlist(id: string, name: string, description: string) {
	// call((addon) => addon.update_playlist(id, name, description))
	// track_lists_details_map.refresh()
	// page.refresh_ids_and_keep_selection()
	// methods.save()
}
export function move_playlist(
	id: TrackListID,
	from_parent: TrackListID,
	to_parent: TrackListID,
	to_index: number,
) {
	call((addon) => addon.move_playlist(id, from_parent, to_parent, to_index))
	track_lists_details_map.refresh()
	methods.save()
}

export const paths = call((addon) => addon.get_paths())

export async function import_tracks(paths: string[]) {
	let err_state = null
	const now = Date.now()
	for (const path of paths) {
		try {
			inner_addon.import_file(path, now)
		} catch (err) {
			if (err_state === 'skip') continue
			const result = await ipc_renderer.invoke('showMessageBox', false, {
				type: 'error',
				message: 'Error importing track ' + path,
				detail: get_error_message(err),
				buttons: err_state ? ['OK', 'Skip all errors'] : ['OK'],
				defaultId: 0,
			})
			if (result.response === 1) err_state = 'skip'
			else err_state = 'skippable'
		}
	}
	tracklist_items_updated.emit()
	methods.save()
}

export function get_default_sort_desc(field: string) {
	return call((addon) => addon.get_default_sort_desc(field))
}

export const methods = {
	importTrack: (path: string, now: MsSinceUnixEpoch) => {
		call((data) => data.import_file(path, now))
	},
	getTrack: (id: TrackID) => {
		return call((data) => data.get_track(id))
	},
	get_track_by_item_id(item_id: ItemId) {
		return call((data) => data.get_track_by_item_id(item_id))
	},
	get_track_ids(item_ids: ItemId[]) {
		return call((data) => data.get_track_ids(item_ids))
	},
	get_tracks_page: (options: TracksPageOptions) => {
		return call((data) => data.get_tracks_page(options))
	},
	trackExists: (id: TrackID) => {
		return call((data) => data.track_exists(id))
	},
	getTrackList: (id: TrackListID) => {
		return call((data) => data.get_track_list(id)) as TrackList
	},
	deleteTrackList: (id: TrackListID) => {
		// console.log('deleteTL')
		// call((data) => data.delete_track_list(id))
		// console.log('id ', '===', ' current_playlist_id')
		// if (id === current_playlist_id) {
		// 	navigate('/playlist/root')
		// }
		// page.refresh_ids_and_keep_selection()
		// pageSelection.clear()
		// track_lists_details_map.refresh()
		// methods.save()
	},
	save: () => {
		return call((addon) => addon.save())
	},
	addPlay: (id: TrackID) => {
		// call((data) => data.add_play(id))
		// page.refresh_ids_and_keep_selection()
		// methods.save()
	},
	addSkip: (id: TrackID) => {
		// call((data) => data.add_skip(id))
		// page.refresh_ids_and_keep_selection()
		// methods.save()
	},
	addPlayTime: (id: TrackID, start_time: MsSinceUnixEpoch, duration_ms: number) => {
		// call((data) => data.add_play_time(id, start_time, duration_ms))
		// page.refresh_ids_and_keep_selection()
		// methods.save()
	},
	readCoverAsync(id: TrackID, index: number) {
		return inner_addon.read_cover_async(id, index).catch((error) => {
			console.log('Could not read cover', error)
			throw error
		})
	},
	updateTrackInfo: (id: TrackID, md: TrackMd) => {
		// call((data) => data.update_track_info(id, md))
		// tracks_updated.emit()
		// page.refresh_ids_and_keep_selection()
		// methods.save()
	},
	loadTags: (id: TrackID) => {
		return call((data) => data.load_tags(id))
	},
	getImage: (index: number) => {
		return call((data) => data.get_image(index))
	},
	setImage: (index: number, path: string) => {
		return call((data) => data.set_image(index, path))
	},
	setImageData: (index: number, bytes: ArrayBuffer) => {
		return call((data) => data.set_image_data(index, bytes))
	},
	removeImage: (index: number) => {
		return call((data) => data.remove_image(index))
	},
	shownPlaylistFolders: () => {
		return call((data) => data.shown_playlist_folders())
	},
	viewFolderSetShow: (id: string, show: boolean) => {
		return call((data) => data.view_folder_set_show(id, show))
	},
	load_view_options: () => {
		return call((data) => data.load_view_options())
	},
	save_view_options: (view_options: ViewOptions) => {
		return call((data) => data.save_view_options(view_options))
	},
}

export const filter = writable('')

function create_refresh_store() {
	const store = writable(0)
	return {
		subscribe: store.subscribe,
		emit() {
			store.update((n) => n + 1)
		},
	}
}
export const tracks_updated = create_refresh_store()
export const tracklist_items_updated = create_refresh_store()

export function get_artists() {
	return call((addon) => addon.get_artists())
}
export function move_tracks(playlist_id: TrackListID, indexes: ItemId[], to_index: number) {
	call((data) => data.move_tracks(playlist_id, indexes, to_index))
	tracklist_items_updated.emit()
	methods.save()
}
