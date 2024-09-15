use crate::data::Data;
use crate::data_js::get_data;
use crate::js::nerr;
use crate::library::{get_track_field_type, TrackField};
use crate::library_types::{SpecialTrackListName, Track, TrackID, TrackList};
use crate::sort::sort;
use crate::{filter, UniResult};
use napi::{Env, JsString, JsUndefined, JsUnknown, Result};
use std::collections::HashSet;
use std::time::Instant;

#[napi(js_name = "open_playlist")]
#[allow(dead_code)]
pub fn open_playlist(open_playlist_id: String, view_as: Option<ViewAs>, env: Env) -> Result<()> {
	let data: &mut Data = get_data(&env)?;
	data.open_playlist(open_playlist_id, view_as)
}

#[napi(js_name = "get_page_track")]
#[allow(dead_code)]
pub fn get_page_track(index: i64, env: Env) -> Result<Track> {
	let data: &mut Data = get_data(&env)?;
	let page_track_ids = data.get_page_tracks();
	let track_id = page_track_ids.get(index as usize).ok_or(nerr!(
		"Track index {} not found in open playlist",
		index.to_string()
	))?;
	let track = data
		.library
		.tracks
		.get(track_id)
		.ok_or(nerr("Track ID not found"))?;
	return Ok(track.clone());
}

#[napi(js_name = "get_page_track_id")]
#[allow(dead_code)]
pub fn get_page_track_id(index: i64, env: Env) -> Result<JsString> {
	let data: &mut Data = get_data(&env)?;
	let page_track_ids = data.get_page_tracks();
	let track_id = page_track_ids.get(index as usize).ok_or(nerr!(
		"Track index {} not found in open playlist",
		index.to_string()
	))?;
	return env.create_string(track_id);
}

#[napi(js_name = "refresh_page")]
#[allow(dead_code)]
pub fn refresh(env: Env) -> Result<JsUndefined> {
	let data: &mut Data = get_data(&env)?;
	let sort_key = data.sort_key.clone();
	let sort_desc = data.sort_desc;
	sort(data, &sort_key, sort_desc)?;
	filter::filter(data, data.filter.clone());
	return env.get_undefined();
}

#[napi(js_name = "get_page_track_ids")]
#[allow(dead_code)]
pub fn get_page_track_ids(env: Env) -> Result<Vec<TrackID>> {
	let data: &mut Data = get_data(&env)?;
	Ok(data.get_page_tracks().to_owned())
}

fn get_tracklist_track_ids(data: &Data, playlist_id: &str) -> UniResult<Vec<TrackID>> {
	match data.library.get_tracklist(playlist_id)? {
		TrackList::Playlist(playlist) => {
			let ids = playlist
				.tracks
				.iter()
				.map(|track_id| track_id.to_string())
				.collect();
			Ok(ids)
		}
		TrackList::Folder(folder) => {
			let mut ids: HashSet<TrackID> = HashSet::new();
			for child in &folder.children {
				let child_ids = get_tracklist_track_ids(data, &child)?;
				ids.extend(child_ids);
			}
			Ok(ids.into_iter().collect())
		}
		TrackList::Special(special) => match special.name {
			SpecialTrackListName::Root => {
				let track_keys = data.library.tracks.keys();
				let ids = track_keys.map(|track| track.to_string()).collect();
				Ok(ids)
			}
		},
	}
}
pub fn get_track_ids(data: &Data) -> UniResult<Vec<TrackID>> {
	let now = Instant::now();
	let ids = get_tracklist_track_ids(data, &data.open_playlist_id)?;
	println!("Load page tracks: {}ms", now.elapsed().as_millis());
	Ok(ids)
}

#[napi]
pub enum ViewAs {
	Songs,
	Artists,
}
impl Default for ViewAs {
	fn default() -> Self {
		Self::Songs
	}
}

#[napi(object)]
pub struct PageInfo {
	pub id: String,
	pub view_as: ViewAs,
	#[napi(ts_type = "TrackList")]
	pub tracklist: JsUnknown,
	pub sort_key: String,
	pub sort_desc: bool,
	pub length: i64,
}

#[allow(dead_code)]
#[napi(js_name = "get_page_info")]
pub fn get_page_info(env: Env) -> Result<PageInfo> {
	let data = get_data(&env)?;
	let tracklist = data.library.get_tracklist(&data.open_playlist_id)?;

	Ok(PageInfo {
		id: data.open_playlist_id.clone(),
		view_as: data.view_as,
		tracklist: env.to_js_value(tracklist)?,
		sort_key: data.sort_key.clone(),
		sort_desc: data.sort_desc,
		length: data.get_page_tracks().len().try_into().expect("Too long"),
	})
}

#[napi(js_name = "set_group_album_tracks")]
#[allow(dead_code)]
pub fn set_group_album_tracks(value: bool, env: Env) -> Result<JsUndefined> {
	let data: &mut Data = get_data(&env)?;
	data.group_album_tracks = value;
	env.get_undefined()
}

#[napi(js_name = "sort")]
#[allow(dead_code)]
pub fn sort_js(sort_key: String, keep_filter: bool, env: Env) -> Result<JsUndefined> {
	let data: &mut Data = get_data(&env)?;

	let old_sort_key = &data.sort_key;
	if &sort_key == old_sort_key {
		data.open_playlist_track_ids.reverse();
		data.sort_desc = !data.sort_desc;
	} else {
		let field = get_track_field_type(&sort_key);
		let desc = match field {
			Some(TrackField::String) => false,
			_ => true,
		};

		sort(data, &sort_key, desc)?;
	}

	if keep_filter {
		filter::filter(data, data.filter.clone());
	}
	return env.get_undefined();
}

#[napi(object)]
pub struct SelectionInfo {
	pub from: u32,
	pub to: u32,
}

#[napi(js_name = "move_tracks")]
#[allow(dead_code)]
pub fn move_tracks(
	mut indexes_to_move: Vec<u32>,
	to_index: u32,
	env: Env,
) -> Result<SelectionInfo> {
	let data: &mut Data = get_data(&env)?;
	indexes_to_move.sort_unstable();
	indexes_to_move.dedup();
	let tracklist = data
		.library
		.trackLists
		.get_mut(&data.open_playlist_id)
		.ok_or(nerr!("Playlist ID not found"))?;
	let playlist = match tracklist {
		TrackList::Playlist(playlist) => playlist,
		TrackList::Folder(_) => return Err(nerr!("Cannot rearrange tracks in folder")),
		TrackList::Special(_) => return Err(nerr!("Cannot rearrange tracks in special playlist")),
	};
	if data.sort_key != "index" || !data.sort_desc {
		return Err(nerr!("Cannot rearrange when custom sorting is used"));
	}
	if data.filter != "" {
		return Err(nerr!("Cannot rearrange when filter is used"));
	}
	let mut start_ids = Vec::new();
	let mut moved_ids = Vec::new();
	let mut end_ids = Vec::new();

	let mut indexes_to_move = indexes_to_move.iter();
	let mut next_index = indexes_to_move.next().map(|n| *n as usize);
	for i in 0..playlist.tracks.len() {
		let id = playlist.tracks.remove(0);
		if Some(i) == next_index {
			next_index = indexes_to_move.next().map(|n| *n as usize);
			moved_ids.push(id);
		} else if i < to_index as usize {
			start_ids.push(id);
		} else {
			end_ids.push(id);
		}
	}
	let new_from = start_ids.len() as u32;
	let new_to = new_from + moved_ids.len() as u32 - 1;
	start_ids.append(&mut moved_ids);
	start_ids.append(&mut end_ids);
	playlist.tracks = start_ids;
	Ok(SelectionInfo {
		from: new_from,
		to: new_to,
	})
}
