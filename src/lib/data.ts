import { get, writable } from 'svelte/store'
import { ipc_renderer } from '@/lib/window'
import type {
	MsSinceUnixEpoch,
	TrackID,
	TrackList,
	TrackListID,
	ItemId,
	TrackMd,
	TracksPageOptions,
	ViewOptions,
} from '../../ferrum-addon'
import { queue } from './queue'
import { current_playlist_id } from '@/components/TrackList.svelte'
import { navigate } from './router'
import { call, get_error_message } from './error'

export const is_dev = window.is_dev
export const local_data_path = window.local_data_path
export const library_path = window.library_path
export const is_mac = window.is_mac
export const is_windws = window.is_windows
const inner_addon = window.addon
export const ItunesImport = inner_addon.ItunesImport

call((addon) => addon.load_data(is_dev, local_data_path, library_path))

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
		tracklist_updated.emit()
		save()
	}
}
export function remove_from_playlist(playlist_id: TrackListID, item_ids: ItemId[]) {
	call((addon) => addon.remove_from_playlist(playlist_id, item_ids))
	tracklist_updated.emit()
	save()
}
export function delete_tracks_with_item_ids(item_ids: ItemId[]) {
	call((addon) => addon.delete_tracks_with_item_ids(item_ids))
	tracklist_updated.emit()
	queue.removeDeleted()
	save()
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
	save()
}
export function update_playlist(id: string, name: string, description: string) {
	call((addon) => addon.update_playlist(id, name, description))
	track_lists_details_map.refresh()
	tracklist_updated.emit()
	save()
}
export function move_playlist(
	id: TrackListID,
	from_parent: TrackListID,
	to_parent: TrackListID,
	to_index: number,
) {
	call((addon) => addon.move_playlist(id, from_parent, to_parent, to_index))
	track_lists_details_map.refresh()
	save()
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
	tracklist_updated.emit()
	save()
}

export function get_default_sort_desc(field: string) {
	return call((data) => data.get_default_sort_desc(field))
}

export function import_track(path: string, now: MsSinceUnixEpoch) {
	call((data) => data.import_file(path, now))
}
export function get_track(id: TrackID) {
	return call((data) => data.get_track(id))
}
export function get_track_by_item_id(item_id: ItemId) {
	return call((data) => data.get_track_by_item_id(item_id))
}
export function get_track_ids(item_ids: ItemId[]) {
	return call((data) => data.get_track_ids(item_ids))
}
export function get_tracks_page(options: TracksPageOptions) {
	return call((data) => data.get_tracks_page(options))
}
export function track_exists(id: TrackID) {
	return call((data) => data.track_exists(id))
}
export function get_track_list(id: TrackListID) {
	return call((data) => data.get_track_list(id)) as TrackList
}
export function delete_track_list(id: TrackListID) {
	call((data) => data.delete_track_list(id))
	if (id === get(current_playlist_id)) {
		navigate('/playlist/root')
	}
	track_lists_details_map.refresh()
	save()
}
export function save() {
	return call((addon) => addon.save())
}
export function add_play(id: TrackID) {
	call((data) => data.add_play(id))
	tracklist_updated.emit()
	save()
}
export function add_skip(id: TrackID) {
	call((data) => data.add_skip(id))
	tracklist_updated.emit()
	save()
}
export function add_play_time(id: TrackID, start_time: MsSinceUnixEpoch, duration_ms: number) {
	call((data) => data.add_play_time(id, start_time, duration_ms))
	save()
}
export function read_cover_async(id: TrackID, index: number) {
	return inner_addon.read_cover_async(id, index).catch((error) => {
		console.log('Could not read cover', error)
		throw error
	})
}
export function update_track_info(id: TrackID, md: TrackMd) {
	call((data) => data.update_track_info(id, md))
	tracks_updated.emit()
	save()
}
export function load_tags(id: TrackID) {
	return call((data) => data.load_tags(id))
}
export function get_image(index: number) {
	return call((data) => data.get_image(index))
}
export function set_image(index: number, path: string) {
	return call((data) => data.set_image(index, path))
}
export function set_image_data(index: number, bytes: ArrayBuffer) {
	return call((data) => data.set_image_data(index, bytes))
}
export function remove_image(index: number) {
	return call((data) => data.remove_image(index))
}
export let view_options = call((data) => data.load_view_options())
export function save_view_options(options: ViewOptions) {
	view_options = options
	return call((data) => data.save_view_options(view_options))
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
export const tracklist_updated = create_refresh_store()

export function get_artists() {
	return call((addon) => addon.get_artists())
}
export function move_tracks(playlist_id: TrackListID, indexes: ItemId[], to_index: number) {
	call((data) => data.move_tracks(playlist_id, indexes, to_index))
	tracklist_updated.emit()
	save()
}
