import { add_tracks_to_playlist, get_track, paths, track_lists_details_map } from '@/lib/data'
import { flatten_child_lists } from '@/lib/helpers'
import { ipc_renderer } from '@/lib/window'
import type { TrackID } from '../../ferrum-addon'
import { get } from 'svelte/store'
import { append_to_user_queue, prepend_to_user_queue } from './queue'
import type { SelectedTracksAction } from '@/electron/typed_ipc'
import { open_track_info } from '@/components/TrackInfo.svelte'

export function get_flattened_tracklists() {
	const track_lists = get(track_lists_details_map)
	return flatten_child_lists(track_lists.root, track_lists, '')
}

export function handle_selected_tracks_action({
	action,
	track_ids,
	all_ids,
	first_index,
}: {
	action: SelectedTracksAction
	track_ids: TrackID[]
	all_ids: TrackID[]
	first_index: number | null
}) {
	if (track_ids.length === 0 || first_index === null) {
		return
	}
	const first_track_id = track_ids[0]

	if (action === 'Play Next') {
		prepend_to_user_queue(track_ids)
	} else if (action === 'Add to Queue') {
		append_to_user_queue(track_ids)
	} else if (action === 'Get Info') {
		open_track_info(all_ids, first_index)
	} else if (action === 'reveal_track_file') {
		const track = get_track(first_track_id)
		ipc_renderer.invoke('revealTrackFile', paths.tracksDir, track.file)
	} else if (typeof action === 'object' && action.action === 'Add to Playlist') {
		add_tracks_to_playlist(action.playlist_id, track_ids)
	}
}
