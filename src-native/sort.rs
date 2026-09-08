use crate::db::TrackIDNew;
use crate::filter::{CachedTrack, SortKey, TracksCache};
use crate::library::TrackField;
use crate::page::TracksPageOptions;
use alphanumeric_sort::compare_str;
use anyhow::Result;
use std::cmp::Ordering;
use std::time::Instant;

pub type TracksPageOptionsX = TracksPageOptions;

fn get_field_str<'a>(track: &'a CachedTrack, sort_key: SortKey) -> Option<&'a String> {
	match sort_key {
		SortKey::AlbumArtist => track.album_artist.as_ref(),
		SortKey::AlbumTitle => track.album_title.as_ref(),
		SortKey::Artist => Some(&track.artist),
		SortKey::Comments => track.comments.as_ref(),
		SortKey::Composer => track.composer.as_ref(),
		SortKey::Genre => track.genre.as_ref(),
		SortKey::Grouping => track.grouping.as_ref(),
		SortKey::Title => Some(&track.title),
		_ => panic!("Field type not found for {:?}", sort_key),
	}
}

fn get_field_f64(track: &CachedTrack, sort_key: SortKey) -> Option<f64> {
	match sort_key {
		SortKey::Bpm => track.bpm,
		SortKey::Duration => Some(track.duration_s),
		_ => panic!("Field type not found for {:?}", sort_key),
	}
}

fn get_field_i64(track: &CachedTrack, sort_key: SortKey) -> Option<i64> {
	match sort_key {
		SortKey::AddedAt => Some(track.added_at),
		SortKey::Year => track.year,
		_ => panic!("Field type not found for {:?}", sort_key),
	}
}

fn get_field_u32(track: &CachedTrack, sort_key: SortKey) -> Option<u32> {
	match sort_key {
		SortKey::DiscCount => track.disc_count,
		SortKey::DiscNum => track.disc_num,
		SortKey::PlayCount => Some(track.play_count),
		SortKey::SkipCount => Some(track.skip_count),
		SortKey::TrackCount => track.track_count,
		SortKey::TrackNum => track.track_num,
		_ => panic!("Field type not found for {:?}", sort_key),
	}
}

struct SortItem<'a> {
	item_id: TrackIDNew,
	track: &'a CachedTrack,
}

pub fn sort(
	ids: Vec<TrackIDNew>,
	options: &TracksPageOptions,
	library: &TracksCache,
) -> Result<Vec<TrackIDNew>> {
	let t = Instant::now();

	let items: Result<Vec<SortItem>> = ids
		.into_iter()
		.map(|id| {
			Ok(SortItem {
				item_id: id,
				track: library.get_track(&id)?,
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
		println!("Sort: {}ms", t.elapsed().as_millis());
		let item_ids = items.into_iter().map(|item| item.item_id).collect();
		return Ok(item_ids);
	}

	let sort_key = SortKey::from_col_view_key(&options.sort_key);
	let group_album_tracks = options.group_album_tracks
		&& match sort_key {
			SortKey::AddedAt
			| SortKey::AlbumTitle
			| SortKey::Comments
			| SortKey::Genre
			| SortKey::Year
			| SortKey::Artist => true,
			_ => false,
		};
	items.sort_by(|a, b| {
		return compare_track_field(a.track, b.track, sort_key);
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
				let mut order = compare_track_field(a.track, b.track, SortKey::DiscNum);
				if order == Ordering::Equal {
					order = compare_track_field(a.track, b.track, SortKey::TrackNum);
				}
				order
			});

			post_grouped_items.append(&mut current_album_buffer);
		}

		assert_eq!(item_count, post_grouped_items.len());
		items = post_grouped_items;
	}

	println!("Sort: {}ms", t.elapsed().as_millis());
	let item_ids = items.into_iter().map(|item| item.item_id).collect();
	return Ok(item_ids);
}

pub fn compare_track_field(a: &CachedTrack, b: &CachedTrack, sort_key: SortKey) -> Ordering {
	let field = sort_key.field_type();
	match field {
		TrackField::String => {
			let str_a = get_field_str(a, sort_key).map(String::as_str).unwrap_or("");
			let str_b = get_field_str(b, sort_key).map(String::as_str).unwrap_or("");
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
	}
}
