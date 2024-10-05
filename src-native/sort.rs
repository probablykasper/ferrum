use crate::library::{get_track_field_type, TrackField};
use crate::library_types::{ItemId, Library, Track, TRACK_ID_MAP};
use crate::page::TracksPageOptions;
use crate::playlists::get_tracklist_item_ids;
use alphanumeric_sort::compare_str;
use anyhow::Result;
use std::cmp::Ordering;
use std::time::Instant;

fn get_field_str<'a>(track: &'a Track, sort_key: &str) -> Option<&'a String> {
	match sort_key {
		"file" => Some(&track.file),
		"name" => Some(&track.name),
		"importedFrom" => track.importedFrom.as_ref(),
		"originalId" => track.originalId.as_ref(),
		"artist" => Some(&track.artist),
		"composer" => track.composer.as_ref(),
		"sortName" => track.sortName.as_ref(),
		"sortArtist" => track.sortArtist.as_ref(),
		"sortComposer" => track.sortComposer.as_ref(),
		"genre" => track.genre.as_ref(),
		"comments" => track.comments.as_ref(),
		"grouping" => track.grouping.as_ref(),
		"albumName" => track.albumName.as_ref(),
		"albumArtist" => track.albumArtist.as_ref(),
		"sortAlbumName" => track.sortAlbumName.as_ref(),
		"sortAlbumArtist" => track.sortAlbumArtist.as_ref(),
		_ => panic!("Field type not found for {}", sort_key),
	}
}

fn get_field_f64(track: &Track, sort_key: &str) -> Option<f64> {
	match sort_key {
		"duration" => Some(track.duration),
		"bitrate" => Some(track.bitrate),
		"sampleRate" => Some(track.sampleRate),
		"bpm" => track.bpm,
		_ => panic!("Field type not found for {}", sort_key),
	}
}

fn get_field_i64(track: &Track, sort_key: &str) -> Option<i64> {
	match sort_key {
		"size" => Some(track.size),
		"dateModified" => Some(track.dateModified),
		"dateAdded" => Some(track.dateAdded),
		"dateImported" => track.dateImported,
		"year" => track.year,
		_ => panic!("Field type not found for {}", sort_key),
	}
}

fn get_field_u32(track: &Track, sort_key: &str) -> Option<u32> {
	match sort_key {
		"trackNum" => track.trackNum,
		"trackCount" => track.trackCount,
		"discNum" => track.discNum,
		"discCount" => track.discCount,
		"playCount" => track.playCount,
		"skipCount" => track.skipCount,
		_ => panic!("Field type not found for {}", sort_key),
	}
}

fn get_field_i8(track: &Track, sort_key: &str) -> Option<i8> {
	match sort_key {
		"volume" => track.volume,
		_ => panic!("Field type not found for {}", sort_key),
	}
}

fn get_field_u8(track: &Track, sort_key: &str) -> Option<u8> {
	match sort_key {
		"rating" => track.rating,
		_ => panic!("Field type not found for {}", sort_key),
	}
}

fn get_field_bool(track: &Track, sort_key: &str) -> Option<bool> {
	match sort_key {
		"liked" => track.liked,
		"disliked" => track.disliked,
		"disabled" => track.disabled,
		"compilation" => track.compilation,
		_ => panic!("Field type not found for {}", sort_key),
	}
}

pub fn sort(options: TracksPageOptions, library: &Library) -> Result<Vec<ItemId>> {
	let now = Instant::now();

	let id_map = TRACK_ID_MAP.read().unwrap();

	let mut item_ids = get_tracklist_item_ids(library, &options.playlist_id)?;
	let item_count = item_ids.len();

	if options.sort_key == "index" {
		// Note: Indexes descend from "first to last", unlike
		// other numbers which ascend from "high to low"
		if !options.sort_desc {
			item_ids.reverse();
		}
		println!("Sort: {}ms", now.elapsed().as_millis());
		return Ok(item_ids);
	}

	let tracks = library.get_tracks();
	let field = get_track_field_type(&options.sort_key)?;
	let group_album_tracks = options.group_album_tracks
		&& match options.sort_key.as_str() {
			"dateAdded" | "albumName" | "comments" | "genre" | "year" | "artist" => true,
			_ => false,
		};
	item_ids.sort_by(|&id_a, &id_b| {
		let track_id_a = &id_map[id_a as usize];
		let track_id_b = &id_map[id_b as usize];
		let track_a = tracks.get(track_id_a).expect("Track ID non-existant (1)");
		let track_b = tracks.get(track_id_b).expect("Track ID non-existant (2)");
		compare_track_field(track_a, track_b, &options.sort_key, &field)
	});

	if options.sort_desc {
		item_ids.reverse();
	}

	if group_album_tracks {
		let mut grouped_track_ids: Vec<ItemId> = Vec::with_capacity(item_ids.len());
		let mut item_ids_iter = item_ids.into_iter().peekable();

		// Process the first track in the next album
		while let Some(first_item_id) = item_ids_iter.next() {
			// We need to get the first track to compare with the later tracks
			let first_track_id = &id_map[first_item_id as usize];
			let first_track = tracks.get(first_track_id).unwrap();
			let mut current_album_buffer: Vec<ItemId> = vec![first_item_id];

			// Collect the rest of the tracks from the same album
			while let Some(item_id) = item_ids_iter.peek() {
				let track_id = &id_map[*item_id as usize];
				let track = tracks.get(track_id).unwrap();
				if !track.is_same_album(first_track) {
					break;
				}
				current_album_buffer.push(*item_id);
				item_ids_iter.next();
			}

			// Sort album tracks by discNum, then trackNum
			current_album_buffer.sort_by(|&id_a, &id_b| {
				let track_a = tracks.get(&id_map[id_a as usize]).unwrap();
				let track_b = tracks.get(&id_map[id_b as usize]).unwrap();
				let mut order = compare_track_field(track_a, track_b, "discNum", &TrackField::U32);
				if order == Ordering::Equal {
					order = compare_track_field(track_a, track_b, "trackNum", &TrackField::U32);
				}
				order
			});

			grouped_track_ids.append(&mut current_album_buffer);
		}

		assert_eq!(item_count, grouped_track_ids.len());
		item_ids = grouped_track_ids;
	}

	println!("Sort group: {}ms", now.elapsed().as_millis());
	return Ok(item_ids);
}

pub fn compare_track_field(a: &Track, b: &Track, sort_key: &str, field: &TrackField) -> Ordering {
	match field {
		TrackField::String => {
			let empty_str = &"".to_string();
			let str_a = get_field_str(a, sort_key).unwrap_or(empty_str);
			let str_b = get_field_str(b, sort_key).unwrap_or(empty_str);
			if str_a == "" && str_b == "" {
				return Ordering::Equal;
			}
			if str_a == "" {
				return Ordering::Greater;
			}
			if str_b == "" {
				return Ordering::Less;
			}
			return compare_str(str_a, str_b);
		}
		TrackField::F64 => {
			let num_a = get_field_f64(a, sort_key).unwrap_or(0.0);
			let num_b = get_field_f64(b, sort_key).unwrap_or(0.0);
			match num_a.partial_cmp(&num_b) {
				Some(v) => v,
				None => panic!("Unable to compare f64 {} and {}", num_a, num_b),
			}
		}
		TrackField::I64 => {
			let num_a = get_field_i64(a, sort_key).unwrap_or(0);
			let num_b = get_field_i64(b, sort_key).unwrap_or(0);
			return num_a.cmp(&num_b);
		}
		TrackField::U32 => {
			let num_a = get_field_u32(a, sort_key).unwrap_or(0);
			let num_b = get_field_u32(b, sort_key).unwrap_or(0);
			return num_a.cmp(&num_b);
		}
		TrackField::I8 => {
			let num_a = get_field_i8(a, sort_key).unwrap_or(0);
			let num_b = get_field_i8(b, sort_key).unwrap_or(0);
			return num_a.cmp(&num_b);
		}
		TrackField::U8 => {
			let num_a = get_field_u8(a, sort_key).unwrap_or(0);
			let num_b = get_field_u8(b, sort_key).unwrap_or(0);
			return num_a.cmp(&num_b);
		}
		TrackField::Bool => {
			let bool_a = get_field_bool(a, sort_key).unwrap_or(false); //? look into this
			let bool_b = get_field_bool(b, sort_key).unwrap_or(false); //? look into this
			return bool_a.cmp(&bool_b);
		}
	}
}
