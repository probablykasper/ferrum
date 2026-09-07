use crate::data::Data;
use crate::db::{SpecialTrackListId, TrackListKind, TrackListVariant};
use crate::filter::{FilterTerm, TracksCache, filter};
use crate::library_types::{ItemId, new_item_ids_from_track_ids};
use anyhow::{Context, Result};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use specta::Type;

#[cfg_attr(feature = "napi", napi(object))]
#[derive(Deserialize, Clone, Type)]
pub struct TracksPageOptions {
	pub playlist_id: String,
	pub sort_key: String,
	pub sort_desc: bool,
	pub filter_terms: Vec<FilterTerm>,
	pub group_album_tracks: bool,
}

#[cfg_attr(feature = "napi", napi(object))]
#[derive(Serialize, Type)]
pub struct TracksPage {
	pub playlist_kind: String,
	pub playlist_name: String,
	pub playlist_description: String,
	pub playlist_length: u32,
	pub item_ids: Vec<ItemId>,
}

#[derive(Debug)]
struct TrackListPage {
	kind: TrackListKind,
	id: String,
	name: String,
	description: String,
}
impl TrackListPage {
	pub fn variant(&self) -> TrackListVariant {
		match self.kind {
			TrackListKind::Playlist => TrackListVariant::Playlist,
			TrackListKind::Folder => TrackListVariant::Folder,
			TrackListKind::Special => {
				TrackListVariant::from_special_track_list_id(SpecialTrackListId::from_id(&self.id))
			}
		}
	}
}

// returns (column_name, is_text)
fn to_sql_sort_key(sort_key: &str) -> (&'static str, bool) {
	match sort_key {
		"albumName" => ("album_title", true),
		"albumArtist" => ("album_artist", true),
		"artist" => ("artist", true),
		"bpm" => ("bpm", false),
		"comments" => ("comments", true),
		"composer" => ("composer", true),
		"dateAdded" => ("added_at", false),
		"duration" => ("duration_s", false),
		"genre" => ("genre", true),
		"grouping" => ("grouping", true),
		"name" => ("title", true),
		"playCount" => ("play_count", false),
		"skipCount" => ("skip_count", false),
		"year" => ("year", false),
		sort_key => panic!("Invalid sort key {sort_key}"),
	}
}

#[cfg(feature = "napi")]
#[cfg_attr(feature = "napi", napi(js_name = "get_tracks_page"))]
#[allow(dead_code)]
pub fn get_tracks_page_js(options: TracksPageOptions) -> Result<TracksPage> {
	get_tracks_page(options)
}

pub fn get_tracks_page(options: TracksPageOptions) -> Result<TracksPage> {
	let mut data = Data::get_blocking();
	let data: &mut Data = &mut data;
	let mut db = &mut data.db;

	match &mut data.tracks_cache {
		Some(cache) => {
			let start_time = std::time::Instant::now();
			cache
				.refresh(&mut db)
				.context("Failed to refresh tracks cache")?;
			println!("cache refresh took {:?}", start_time.elapsed());
		}
		None => {
			let start_time = std::time::Instant::now();
			let tracks_cache =
				TracksCache::load_all(&mut db).context("Failed to load tracks cache")?;
			data.tracks_cache = Some(tracks_cache);
			println!("cache took {:?}", start_time.elapsed());
		}
	};
	let tracks_cache = data.tracks_cache.as_ref().unwrap();

	let tx = db.transaction().context("Failed to begin transaction")?;

	let start_time = std::time::Instant::now();

	let track_list: TrackListPage = tx
		.prepare_cached(
			"SELECT kind, id, name, description
		FROM track_lists
		WHERE id = ?",
		)?
		.query_one(params![&options.playlist_id], |row| {
			Ok(TrackListPage {
				kind: row.get(0)?,
				id: row.get(1)?,
				name: row.get(2)?,
				description: row.get(3)?,
			})
		})
		.context("Failed to get playlist")?;

	println!("TL took {:?}", start_time.elapsed());

	// let direction = match options.sort_desc {
	// 	true => "DESC",
	// 	false => "ASC",
	// };
	// let mut order_by_clauses = Vec::new();
	// match options.sort_key.as_str() {
	// 	"index" => match track_list.kind {
	// 		TrackListKind::Playlist => {
	// 			order_by_clauses.push(format!("playlist_tracks.item_pos {direction}"))
	// 		}
	// 		TrackListKind::Folder => todo!(),
	// 		TrackListKind::Special => order_by_clauses.push(format!("tracks.added_at {direction}")),
	// 	},
	// 	sort_key => {
	// 		// TEXT columns should have empty values sorted last
	// 		let (sql_sort_key, is_text_col) = to_sql_sort_key(sort_key);
	// 		if is_text_col {
	// 			order_by_clauses.push(format!(
	// 				"CASE WHEN tracks.{sql_sort_key} IS NULL OR tracks.{sql_sort_key} = '' \
	//             THEN 1 ELSE 0 END ASC"
	// 			));
	// 		}
	// 		match track_list.kind {
	// 			TrackListKind::Playlist => {
	// 				order_by_clauses.push(format!("tracks.{sql_sort_key} {direction}"));
	// 				order_by_clauses.push("playlist_tracks.item_pos ASC".to_string());
	// 			}
	// 			TrackListKind::Folder => todo!(),
	// 			TrackListKind::Special => {
	// 				order_by_clauses.push(format!("tracks.{sql_sort_key} {direction}"));
	// 				order_by_clauses.push("tracks.added_at ASC".to_string());
	// 			}
	// 		}
	// 	}
	// };
	// let order_by = order_by_clauses.join(", ");

	let track_ids = match track_list.variant() {
		TrackListVariant::Playlist => {
			// let track_ids: Vec<i64> = sqlx::query_scalar(
			// 	"SELECT t.id
			// 	FROM playlist_tracks pt
			// 	JOIN tracks t ON t.id = pt.track_id
			// 	WHERE pt.trck_list_id = ?",
			// )
			// .bind(&options.playlist_id)
			// .fetch_all(&mut *tx)
			// .await
			// .context("Failed to get playlist tracks")?;
			todo!();
		}
		TrackListVariant::Folder => todo!(),
		TrackListVariant::Root => {
			let track_ids: Vec<i64> = tx
				.prepare_cached(
					"SELECT id
					FROM tracks
					ORDER BY added_at DESC",
				)?
				.query_map([], |row| row.get(0))?
				.collect::<rusqlite::Result<_>>()
				.context("Failed to get playlist tracks")?;
			track_ids
		}
	};
	println!("IDs took {:?}", start_time.elapsed());

	let track_ids = filter(track_ids, options.filter_terms, tracks_cache);

	println!(
		"get_tracks_page took {:?}, {} results",
		start_time.elapsed(),
		track_ids.len()
	);

	// todo: remove this
	let text_ids: Vec<String> = tx
		.prepare_cached("SELECT text_id FROM tracks WHERE id IN (SELECT value FROM json_each(?))")?
		.query_map([serde_json::to_string(&track_ids)?], |row| row.get(0))?
		.collect::<rusqlite::Result<_>>()?;

	tx.commit()?;

	// todo: remove this
	let item_ids = new_item_ids_from_track_ids(&text_ids);

	Ok(TracksPage {
		playlist_kind: track_list.kind.to_string(),
		playlist_name: track_list.name,
		playlist_description: track_list.description,
		playlist_length: track_ids.len().try_into().unwrap(),
		item_ids,
	})
}

#[cfg(test)]
mod tests {
	use crate::{
		data::Data,
		library_types::SpecialTrackListName,
		page::{TracksPageOptions, get_tracks_page},
	};
	use std::path::PathBuf;

	#[tokio::test]
	async fn test_get_tracks_page() -> anyhow::Result<()> {
		let library_path = PathBuf::from("./src-native/appdata/Library big");
		Data::load(true, None, Some(library_path.to_string_lossy().to_string()))
			.await
			.unwrap();
		let result = get_tracks_page(TracksPageOptions {
			playlist_id: SpecialTrackListName::Root.get_id().to_string(),
			sort_key: "name".to_string(),
			sort_desc: false,
			filter_terms: vec![],
			group_album_tracks: false,
		})
		.await?;

		println!("result: {:#?}", result.item_ids.len());

		Ok(())
	}
}
