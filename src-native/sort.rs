use crate::library::{TrackField, get_track_field_type};
use crate::library_types::{ItemId, Library, TRACK_ID_MAP, Track};
use crate::page::TracksPageOptions;
use crate::playlists::get_tracklist_item_ids;
use alphanumeric_sort::compare_str;
use anyhow::{Context, Result};
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

struct SortItem<'a> {
	item_id: ItemId,
	track: &'a Track,
}

pub fn sort(options: TracksPageOptions, library: &Library) -> Result<Vec<ItemId>> {
	let now = Instant::now();

	let id_map = TRACK_ID_MAP.read().unwrap();
	let tracks = library.get_tracks();

	let items: Result<Vec<SortItem>> = get_tracklist_item_ids(library, &options.playlist_id)?
		.into_iter()
		.enumerate()
		.map(|(i, id)| {
			Ok(SortItem {
				item_id: id,
				track: tracks.get(&id_map[id as usize]).context(format!(
					"Track {i} ({}) does not exist",
					id_map[id as usize]
				))?,
			})
		})
		.collect();
	let mut items = items?;
	let item_count = items.len();

	if options.sort_key == "index" {
		// Note: Indexes descend from "first to last", unlike
		// other numbers which ascend from "high to low"
		if !options.sort_desc {
			items.reverse();
		}
		println!("Sort: {}ms", now.elapsed().as_millis());
		let item_ids = items.into_iter().map(|item| item.item_id).collect();
		return Ok(item_ids);
	}

	let field = get_track_field_type(&options.sort_key)?;
	let group_album_tracks = options.group_album_tracks
		&& match options.sort_key.as_str() {
			"dateAdded" | "albumName" | "comments" | "genre" | "year" | "artist" => true,
			_ => false,
		};
	items.sort_by(|a, b| {
		return compare_track_field(a.track, b.track, &options.sort_key, &field);
	});

	if options.sort_desc {
		items.reverse();
	}

	if group_album_tracks {
		let mut post_grouped_items: Vec<_> = Vec::with_capacity(items.len());
		let mut items_iter = items.into_iter().peekable();

		// Process the first track in the next album
		while let Some(first_item) = items_iter.next() {
			let first_track = first_item.track;
			// We need to get the first track to compare with the later tracks
			let mut current_album_buffer: Vec<SortItem> = vec![first_item];

			// Collect the rest of the tracks from the same album
			while let Some(item) = items_iter.peek() {
				if !item.track.is_same_album(first_track) {
					break;
				}
				let item = items_iter.next().unwrap();
				current_album_buffer.push(item);
			}

			// Sort album tracks by discNum, then trackNum
			current_album_buffer.sort_by(|a, b| {
				let mut order = compare_track_field(a.track, b.track, "discNum", &TrackField::U32);
				if order == Ordering::Equal {
					order = compare_track_field(a.track, b.track, "trackNum", &TrackField::U32);
				}
				order
			});

			post_grouped_items.append(&mut current_album_buffer);
		}

		assert_eq!(item_count, post_grouped_items.len());
		items = post_grouped_items;
	}

	println!("Sort: {}ms", now.elapsed().as_millis());
	let item_ids = items.into_iter().map(|item| item.item_id).collect();
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
