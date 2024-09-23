import {
	add_track_to_playlist,
	methods,
	paths,
	remove_from_playlist,
	track_lists_details_map,
} from '@/lib/data'
import { flatten_child_lists } from '@/lib/helpers'
import { ipc_renderer } from '@/lib/window'
import type { TrackID } from '../../ferrum-addon'
import { get } from 'svelte/store'
import { append_to_user_queue, prepend_to_user_queue } from './queue'
import type { ShowTrackMenuOptions } from '@/electron/typed_ipc'
import { current_playlist_id } from '@/components/TrackList.svelte'

export async function show_track_menu(
	all_ids: string[],
	selected_indexes: number[],
	playlist?: { editable: boolean },
	queue = false,
) {
	const track_lists = get(track_lists_details_map)
	const flat = flatten_child_lists(track_lists.root, track_lists, '')

	const args: ShowTrackMenuOptions = {
		allIds: all_ids,
		selectedIndexes: selected_indexes,
		playlist,
		queue,
		lists: flat,
	}
	console.log('args.allids', args.allIds)

	await ipc_renderer.invoke('showTrackMenu', args)
}

ipc_renderer.on('context.Play Next', (e, ids: TrackID[]) => {
	prepend_to_user_queue(ids)
})
ipc_renderer.on('context.Add to Queue', (e, ids: TrackID[]) => {
	append_to_user_queue(ids)
})
ipc_renderer.on('context.Add to Playlist', (e, id: TrackID, track_ids: TrackID[]) => {
	add_track_to_playlist(id, track_ids)
})
ipc_renderer.on('context.revealTrackFile', (e, id: TrackID) => {
	const track = methods.getTrack(id)
	ipc_renderer.invoke('revealTrackFile', paths.tracksDir, track.file)
})
ipc_renderer.on('context.Remove from Playlist', (e, indexes: number[]) => {
	const playlist_id = get(current_playlist_id)
	remove_from_playlist(playlist_id, indexes)
})
