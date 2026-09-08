use crate::data::Data;
#[cfg(feature = "napi-rs")]
use crate::db::TrackIDNew;
use crate::get_now_timestamp;
use crate::library::Paths;
use crate::library_types::{
	ItemId, MsSinceUnixEpoch, PercentInteger, TRACK_ID_MAP, Track, TrackID,
};
use anyhow::{Context, Result, bail};
#[cfg(feature = "napi")]
use napi::bindgen_prelude::{ArrayBuffer, Buffer};
use specta::Type;
use std::fs;
use std::path::Path;

pub mod cover;
pub mod import;
mod md;
mod tag;

pub use tag::Tag;

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "get_track"))]
#[allow(dead_code)]
pub fn get_track_js(id: TrackIDNew) -> Result<TrackNew> {
	get_track(id)
}

#[derive(Clone, Debug, Type)]
#[cfg_attr(feature = "napi", napi(object))]
pub struct TrackNew {
	pub id: TrackIDNew,
	pub text_id: String,
	pub added_at: MsSinceUnixEpoch,
	pub album_artist: Option<String>,
	pub album_title: Option<String>,
	pub artist: String,
	pub bitrate: f64,
	pub bpm: Option<f64>,
	pub comments: Option<String>,
	pub compilation: Option<bool>,
	pub composer: Option<String>,
	pub disabled: Option<bool>,
	pub disc_count: Option<u32>,
	pub disc_num: Option<u32>,
	pub disliked: Option<bool>,
	pub duration_s: f64,
	pub file: String,
	pub filesize: i64,
	pub genre: Option<String>,
	pub grouping: Option<String>,
	pub imported_at: Option<MsSinceUnixEpoch>,
	pub imported_from: Option<String>,
	pub liked: Option<bool>,
	pub modified_at: MsSinceUnixEpoch,
	pub original_id: Option<String>,
	pub play_count: u32,
	pub rating_pct: Option<PercentInteger>,
	pub sample_rate: f64,
	pub skip_count: u32,
	pub sort_album_artist: Option<String>,
	pub sort_album_title: Option<String>,
	pub sort_artist: Option<String>,
	pub sort_composer: Option<String>,
	pub sort_title: Option<String>,
	pub title: String,
	pub track_count: Option<u32>,
	pub track_num: Option<u32>,
	pub volume: Option<i8>,
	pub year: Option<i64>,
}

pub fn get_track(id: TrackIDNew) -> Result<TrackNew> {
	let data = Data::get_blocking();
	let sql = format!(
		"SELECT
			id,
			text_id,
			added_at,
			album_artist,
			album_title,
			artist,
			bitrate,
			bpm,
			comments,
			compilation,
			composer,
			disabled,
			disc_count,
			disc_num,
			disliked,
			duration_s,
			file,
			filesize,
			genre,
			grouping,
			imported_at,
			imported_from,
			liked,
			modified_at,
			original_id,
			play_count,
			rating_pct,
			sample_rate,
			skip_count,
			sort_album_artist,
			sort_album_title,
			sort_artist,
			sort_composer,
			sort_title,
			title,
			track_count,
			track_num,
			volume,
			year
		FROM tracks
		WHERE id = ?"
	);
	let track: TrackNew = data
		.db
		.prepare_cached(&sql)?
		.query_one([id], |row| {
			let track = TrackNew {
				id: row.get(0)?,
				text_id: row.get(1)?,
				added_at: row.get(2)?,
				album_artist: row.get(3)?,
				album_title: row.get(4)?,
				artist: row.get(5)?,
				bitrate: row.get(6)?,
				bpm: row.get(7)?,
				comments: row.get(8)?,
				compilation: row.get(9)?,
				composer: row.get(10)?,
				disabled: row.get(11)?,
				disc_count: row.get(12)?,
				disc_num: row.get(13)?,
				disliked: row.get(14)?,
				duration_s: row.get(15)?,
				file: row.get(16)?,
				filesize: row.get(17)?,
				genre: row.get(18)?,
				grouping: row.get(19)?,
				imported_at: row.get(20)?,
				imported_from: row.get(21)?,
				liked: row.get(22)?,
				modified_at: row.get(23)?,
				original_id: row.get(24)?,
				play_count: row.get(25)?,
				rating_pct: row.get(26)?,
				sample_rate: row.get(27)?,
				skip_count: row.get(28)?,
				sort_album_artist: row.get(29)?,
				sort_album_title: row.get(30)?,
				sort_artist: row.get(31)?,
				sort_composer: row.get(32)?,
				sort_title: row.get(33)?,
				title: row.get(34)?,
				track_count: row.get(35)?,
				track_num: row.get(36)?,
				volume: row.get(37)?,
				year: row.get(38)?,
			};
			Ok(track)
		})
		.with_context(|| "Could not get track with ID {id}")?;
	Ok(track)
}

#[cfg_attr(feature = "napi", napi(object))]
pub struct KeyedTrack {
	pub id: TrackID,
	pub track: Track,
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "get_track_by_item_id"))]
#[allow(dead_code)]
pub fn get_track_by_item_id(item_id: ItemId) -> Result<KeyedTrack> {
	let data = Data::get_blocking();
	let id_map = TRACK_ID_MAP.read().unwrap();
	let track_id = &id_map[item_id as usize];
	let track = data.library.get_track(&track_id)?;
	Ok(KeyedTrack {
		id: track_id.clone(),
		track: track.clone(),
	})
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "get_track_ids"))]
#[allow(dead_code)]
pub fn get_track_ids(item_ids: Vec<ItemId>) -> Vec<TrackID> {
	let id_map = TRACK_ID_MAP.read().unwrap();
	let track_ids = item_ids.into_iter().map(|item_id| {
		let track_id = &id_map[item_id as usize];
		track_id.clone()
	});
	track_ids.collect()
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "track_exists"))]
#[allow(dead_code)]
pub fn track_exists(id: String) -> bool {
	let data = Data::get_blocking();
	let tracks = &data.library.get_tracks();
	tracks.contains_key(&id)
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "add_play"))]
#[allow(dead_code)]
pub fn add_play(track_id: String) -> Result<()> {
	let mut data = Data::get_blocking();
	let track = data.library.get_track_mut(&track_id)?;
	let timestamp = get_now_timestamp();
	match &mut track.plays {
		None => track.plays = Some(vec![timestamp]),
		Some(plays) => plays.push(timestamp),
	}
	match &mut track.playCount {
		None => track.playCount = Some(1),
		Some(play_count) => *play_count += 1,
	}
	Ok(())
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "add_skip"))]
#[allow(dead_code)]
pub fn add_skip(track_id: String) -> Result<()> {
	let mut data = Data::get_blocking();
	let track = data.library.get_track_mut(&track_id)?;
	let timestamp = get_now_timestamp();
	match &mut track.skips {
		None => track.skips = Some(vec![timestamp]),
		Some(skips) => skips.push(timestamp),
	}
	match &mut track.skipCount {
		None => track.skipCount = Some(1),
		Some(skip_count) => *skip_count += 1,
	}
	Ok(())
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "add_play_time"))]
#[allow(dead_code)]
pub fn add_play_time(id: TrackID, start: MsSinceUnixEpoch, dur_ms: i64) -> Result<()> {
	let mut data = Data::get_blocking();
	let tracks = data.library.get_tracks();
	tracks.get(&id).context("Track ID not found")?;
	data.library.playTime.push((id, start, dur_ms));
	Ok(())
}

fn sanitize_filename(input: &String) -> String {
	let mut string = input.replace('/', "_");
	string = string.replace('?', "_");
	string = string.replace('<', "_");
	string = string.replace('>', "_");
	string = string.replace('\\', "_");
	string = string.replace(':', "_");
	string = string.replace('*', "_");
	string = string.replace('\"', "_");
	// prevent control characters:
	string = string.replace("0x", "__");
	// Filenames can be max 255 bytes. We use 230 to give
	// margin for the fileNum and file extension.
	string.truncate(230);
	return string;
}

pub fn generate_filename(paths: &Paths, artist: &str, title: &str, ext: &str) -> String {
	let beginning = artist.to_owned() + " - " + title;
	let beginning = sanitize_filename(&beginning);

	let mut file_num: u32 = 1;
	let mut filename = beginning.clone() + "." + ext;
	for i in 0..9999 {
		if i == 1000 {
			panic!("Already got 500 files with that artist and title")
		}
		let full_path = paths.get_track_file_path(&filename);
		if full_path.exists() {
			file_num += 1;
			filename = beginning.clone() + " " + file_num.to_string().as_str() + "." + ext;
		} else {
			break;
		}
	}
	return filename;
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "import_file"))]
#[allow(dead_code)]
pub fn import_file(path: String, now: MsSinceUnixEpoch) -> Result<()> {
	let mut data = Data::get_blocking();
	let id = data.library.generate_id();
	let track = import::import(&data, Path::new(&path), now)?;
	data.library.insert_track(id, track);
	Ok(())
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "load_tags"))]
#[allow(dead_code)]
pub fn load_tags(track_id: String) -> Result<()> {
	let data = &mut *Data::get_blocking();
	data.current_tag = None;
	let track = data
		.library
		.get_track_mut(&track_id)
		.context("Could not load tags")?;

	let path = data.paths.get_track_file_path(&track.file);
	let tag = Tag::read_from_path(&path).context("Could not load tags")?;
	data.current_tag = Some(tag);
	Ok(())
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(object))]
pub struct JsImage {
	pub index: i64,
	pub total_images: i64,
	pub mime_type: String,
	pub data: Buffer,
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "get_image"))]
#[allow(dead_code)]
pub fn get_image(index: u32) -> Result<Option<JsImage>> {
	let data = Data::get_blocking();

	let tag = match &data.current_tag {
		Some(tag) => tag,
		None => bail!("Could not load image: No tag loaded"),
	};
	let img = match tag
		.get_image_ref(index as usize)
		.context("Could not load image")?
	{
		Some(image) => image,
		None => return Ok(None),
	};

	let js_image = JsImage {
		index: img.index,
		total_images: img.total_images,
		mime_type: img.mime_type.to_string(),
		data: img.data.into(),
	};
	Ok(Some(js_image))
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "set_image"))]
#[allow(dead_code)]
pub fn set_image(index: u32, path: String) -> Result<()> {
	let mut data = Data::get_blocking();
	let tag = match &mut data.current_tag {
		Some(tag) => tag,
		None => bail!("No tag loaded"),
	};
	let new_bytes = fs::read(&path).context("Error reading that file")?;
	tag.set_image(index as usize, new_bytes)?;
	Ok(())
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "set_image_data"))]
#[allow(dead_code)]
pub fn set_image_data(index: u32, bytes: ArrayBuffer) -> Result<()> {
	let mut data = Data::get_blocking();
	let tag = match &mut data.current_tag {
		Some(tag) => tag,
		None => bail!("No tag loaded"),
	};
	tag.set_image(index as usize, bytes.to_vec())?;
	Ok(())
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "remove_image"))]
#[allow(dead_code)]
pub fn remove_image(index: u32) -> () {
	let mut data = Data::get_blocking();
	match data.current_tag {
		Some(ref mut tag) => {
			tag.remove_image(index as usize);
		}
		None => {}
	};
}

#[cfg(feature = "napi-rs")]
#[cfg_attr(feature = "napi", napi(js_name = "update_track_info"))]
#[allow(dead_code)]
pub fn update_track_info(track_id: String, info: md::TrackMD) -> Result<()> {
	let data = &mut *Data::get_blocking();
	let track = data.library.get_track_mut(&track_id)?;

	let tag = match &mut data.current_tag {
		Some(tag) => tag,
		None => bail!("No tag loaded"),
	};
	md::update_track_info(&data.paths, track, tag, info)?;

	Ok(())
}
