use crate::data::Data;
use crate::data_js::get_data;
use crate::filter::filter;
use crate::library_types::{
	ItemId, Library, SpecialTrackListName, TrackID, TrackList, PLAYLIST_TRACK_ID_MAP,
};
use crate::sort::sort;
use crate::UniResult;
use napi::{Env, JsUnknown, Result};
use std::collections::HashSet;

#[napi(object)]
#[derive(Clone)]
pub struct TracksPageOptions {
	pub playlist_id: String,
	pub sort_key: String,
	pub sort_desc: bool,
	pub filter_query: String,
	pub group_album_tracks: bool,
}

#[napi(object)]
pub struct TracksPage {
	pub playlist_name: String,
	pub playlist_description: Option<String>,
	pub playlist_length: u32,
	pub track_ids: Vec<TrackID>,
}

#[napi(js_name = "get_tracks_page")]
#[allow(dead_code)]
pub fn get_tracks_page(options: TracksPageOptions, env: Env) -> Result<TracksPage> {
	let data: &mut Data = get_data(&env)?;
	let tracklist = data.library.get_tracklist(&options.playlist_id)?;
	let track_ids = sort(options.clone(), &data.library)?;
	let tracklist_length = track_ids.len();
	let track_ids = filter(track_ids, options.filter_query, &data.library);
	let track_page = match tracklist {
		TrackList::Playlist(playlist) => TracksPage {
			playlist_name: playlist.name.clone(),
			playlist_description: playlist.description.clone(),
			playlist_length: tracklist_length as u32,
			track_ids,
		},
		TrackList::Folder(folder) => TracksPage {
			playlist_name: folder.name.clone(),
			playlist_description: folder.description.clone(),
			playlist_length: tracklist_length as u32,
			track_ids,
		},
		TrackList::Special(special) => TracksPage {
			playlist_name: special.name.to_string(),
			playlist_description: None,
			playlist_length: tracklist_length as u32,
			track_ids,
		},
	};
	Ok(track_page)
}

pub fn get_tracklist_track_ids(library: &Library, playlist_id: &str) -> UniResult<Vec<TrackID>> {
	match library.get_tracklist(playlist_id)? {
		TrackList::Playlist(playlist) => {
			let id_map = PLAYLIST_TRACK_ID_MAP.read().unwrap();
			let ids = playlist
				.tracks
				.iter()
				.map(|item_id| id_map[*item_id as usize].clone())
				.collect();
			Ok(ids)
		}
		TrackList::Folder(folder) => {
			let mut ids: HashSet<TrackID> = HashSet::new();
			for child in &folder.children {
				let child_ids = get_tracklist_track_ids(library, &child)?;
				ids.extend(child_ids);
			}
			Ok(ids.into_iter().collect())
		}
		TrackList::Special(special) => match special.name {
			SpecialTrackListName::Root => {
				let track_keys = library.tracks.keys();
				let ids = track_keys.map(|track| track.to_string()).collect();
				Ok(ids)
			}
		},
	}
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

#[napi(js_name = "move_tracks")]
#[allow(dead_code)]
pub fn move_tracks(
	playlist_id: String,
	mut item_ids: Vec<ItemId>,
	to_index: u32,
	env: Env,
) -> Result<()> {
	let data: &mut Data = get_data(&env)?;
	let playlist = match data.library.get_tracklist_mut(&playlist_id)? {
		TrackList::Playlist(playlist) => playlist,
		_ => return Err(nerr!("Cannot rearrange tracks in non-playlist")),
	};

	let item_ids_set: HashSet<ItemId> = item_ids.iter().cloned().collect();
	assert_eq!(item_ids_set.len(), item_ids.len());

	let playlist_item_ids_set: HashSet<ItemId> = playlist.tracks.iter().cloned().collect();
	for item_id in &item_ids {
		assert!(playlist_item_ids_set.contains(item_id));
	}

	let mut start_items = playlist.tracks.clone();
	start_items.retain(|item_id| !item_ids_set.contains(item_id));

	let mut end_items = start_items.split_off(to_index as usize);
	end_items.retain(|item_id| !item_ids_set.contains(item_id));

	start_items.append(&mut item_ids);

	start_items.append(&mut end_items);

	playlist.tracks = start_items;
	Ok(())
}
