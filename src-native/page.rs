use crate::data::Data;
use crate::data_js::get_data;
use crate::filter::filter;
use crate::library_types::{ItemId, TrackList};
use crate::sort::sort;
use napi::{Env, JsUnknown, Result};

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
	pub playlist_kind: String,
	pub playlist_name: String,
	pub playlist_description: Option<String>,
	pub playlist_length: u32,
	pub item_ids: Vec<ItemId>,
}

#[napi(js_name = "get_tracks_page")]
#[allow(dead_code)]
pub fn get_tracks_page(options: TracksPageOptions, env: Env) -> Result<TracksPage> {
	let data: &mut Data = get_data(&env)?;
	let tracklist = data.library.get_tracklist(&options.playlist_id)?;
	let item_ids = sort(options.clone(), &data.library)?;
	let tracklist_length = item_ids.len();
	let item_ids = filter(item_ids, options.filter_query, &data.library);
	let track_page = match tracklist {
		TrackList::Playlist(playlist) => TracksPage {
			playlist_kind: tracklist.kind().to_string(),
			playlist_name: playlist.name.clone(),
			playlist_description: playlist.description.clone(),
			playlist_length: tracklist_length as u32,
			item_ids,
		},
		TrackList::Folder(folder) => TracksPage {
			playlist_kind: tracklist.kind().to_string(),
			playlist_name: folder.name.clone(),
			playlist_description: folder.description.clone(),
			playlist_length: tracklist_length as u32,
			item_ids,
		},
		TrackList::Special(special) => TracksPage {
			playlist_kind: tracklist.kind().to_string(),
			playlist_name: special.name.to_string(),
			playlist_description: None,
			playlist_length: tracklist_length as u32,
			item_ids,
		},
	};
	Ok(track_page)
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
