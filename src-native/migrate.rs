use crate::library::{Paths, embedded_sql};
use crate::migrate::old_library::{Library, TrackList, TrackLists, load_library_json};
use anyhow::{Context, Result};
use rusqlite::{Connection, OpenFlags, params};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Instant;
use tempfile::TempDir;

pub async fn migrate_to_sqlite(paths: &Paths) -> Result<()> {
	let now = Instant::now();

	let library_dir = PathBuf::from(&paths.library_dir);
	let library_json = library_dir.join("Library.json");

	let library_json = match load_library_json(&library_json)? {
		None => {
			return Ok(());
		}
		Some(library_json) => library_json,
	};

	let tmp_dir = TempDir::new().context("failed to create temp dir")?;
	let tmp_db = tmp_dir.path().join("Library.sqlite");

	let mut db = Connection::open_with_flags(
		&tmp_db,
		OpenFlags::SQLITE_OPEN_CREATE | OpenFlags::SQLITE_OPEN_READ_WRITE,
	)
	.context("Could not create library database")?;
	db.execute_batch("PRAGMA foreign_keys = ON;")
		.context("Error enabling foreign keys")?;

	embedded_sql::migrations::runner()
		.run(&mut db)
		.context("Could not run database migrations")?;

	insert_library_into_db(&library_json, &mut db)
		.context("Could not insert Library.json into database")?;

	db.close()
		.map_err(|(_, e)| e)
		.context("Could not save/close database")?;

	std::fs::rename(&tmp_db, &paths.library_sqlite)
		.context("Failed to finalize sqlite database")?;

	println!("Migrated to SQLite: {}ms", now.elapsed().as_millis());

	// Move Library.json to Library.json.bak
	println!("TODO: Re-enable backing up Library.json");
	// let library_json_backup = library_dir.join("Library backup.json");
	// std::fs::rename(&paths.library_json, library_json_backup)
	// 	.context("Failed to rename Library.json to Library backup.json")?;

	Ok(())
}

fn insert_library_into_db(library: &Library, db: &mut Connection) -> anyhow::Result<()> {
	let tx = db.transaction().context("Failed to begin transaction")?;
	// Defer foreign key checks for track list parent_id
	tx.execute_batch("PRAGMA defer_foreign_keys = ON;")?;

	let mut new_ids: HashMap<&str, u32> = HashMap::new();

	for (i, (text_id, track)) in library.tracks.iter().enumerate() {
		let track_id: u32 = i.try_into().unwrap();
		let removed = new_ids.insert(text_id, track_id);
		assert!(removed.is_none());
		tx.execute(
			"
				INSERT INTO tracks (
					id,
					text_id,
					filesize,
					duration_s,
					bitrate,
					sample_rate,
					file,
					modified_at,
					added_at,
					title,
					artist,
					imported_from,
					original_id,
					composer,
					sort_title,
					sort_artist,
					sort_composer,
					genre,
					rating_pct,
					year,
					bpm,
					comments,
					grouping,
					liked,
					disliked,
					disabled,
					compilation,
					album_title,
					album_artist,
					sort_album_title,
					sort_album_artist,
					track_num,
					track_count,
					disc_num,
					disc_count,
					imported_at,
					play_count,
					skip_count,
					volume
				) VALUES (
					?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
					?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
					?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
					?, ?, ?, ?, ?, ?, ?, ?, ?
				)
			",
			params![
				&track_id,
				&text_id,
				track.size,
				track.duration,
				track.bitrate,
				track.sampleRate,
				&track.file,
				track.dateModified,
				track.dateAdded,
				&track.name,
				&track.artist,
				&track.importedFrom,
				&track.originalId,
				&track.composer,
				&track.sortName,
				&track.sortArtist,
				&track.sortComposer,
				&track.genre,
				track.rating,
				track.year,
				track.bpm,
				&track.comments,
				&track.grouping,
				track.liked,
				track.disliked,
				track.disabled,
				track.compilation,
				&track.albumName,
				&track.albumArtist,
				&track.sortAlbumName,
				&track.sortAlbumArtist,
				track.trackNum,
				track.trackCount,
				track.discNum,
				track.discCount,
				track.dateImported,
				track.playCount.unwrap_or(0),
				track.skipCount.unwrap_or(0),
				track.volume,
			],
		)
		.with_context(|| format!("Failed to insert track {track_id}"))?;

		if let Some(plays) = &track.plays {
			for &date in plays {
				tx.execute(
					"INSERT INTO plays (date, track_id) VALUES (?, ?)",
					params![date, &track_id],
				)
				.with_context(|| format!("Failed to insert plays with date {}", date))?;
			}
		}

		if let Some(imported) = &track.playsImported {
			for co in imported {
				tx.execute(
					"INSERT INTO plays_imported (date_range_from, date_range_to, count, track_id) VALUES (?, ?, ?, ?)",
				params![
				co.fromDate,
				co.toDate,
				co.count,
				&track_id,
				])

				.with_context(|| format!("Failed to insert plays_imported with fromDate {}", co.fromDate))?;
			}
		}

		if let Some(skips) = &track.skips {
			for &date in skips {
				tx.execute(
					"INSERT INTO skips (date, track_id) VALUES (?, ?)",
					params![date, &track_id],
				)
				.with_context(|| format!("Failed to insert skips with date {}", date))?;
			}
		}

		if let Some(imported) = &track.skipsImported {
			for co in imported {
				tx.execute(
					"INSERT INTO skips_imported (date_range_from, date_range_to, count, track_id) VALUES (?, ?, ?, ?)",
				params![
				co.fromDate,
				co.toDate,
				co.count,
				&track_id,
				])

				.with_context(|| format!("Failed to insert skips_imported with fromDate {}", co.fromDate))?;
			}
		}
	}

	// Playtimes were incorrect and overwritten after relaunch, so nothing to keep

	let parent_map = build_parent_map(&library.trackLists);

	for (list_id, tracklist) in &library.trackLists {
		match tracklist {
			TrackList::Special(special) => {
				let name = special.name.get_name_str();
				tx.execute(
					"
						INSERT INTO track_lists
							(id, kind, name, description, created_at)
						VALUES (?, ?, ?, ?, ?)
					",
					params![
						&special.id,
						"special",
						special.name.get_name_str(),
						"",
						special.dateCreated,
					],
				)
				.with_context(|| format!("Failed to insert special playlist {name}"))?;
			}
			TrackList::Folder(folder) => {
				let (index, parent_id) = parent_map
					.get(list_id.as_str())
					.with_context(|| format!("Parent of folder {} not found", folder.name))?;
				tx.execute(
					"
						INSERT INTO track_lists
							(id, kind, parent_id, item_pos, name, description, liked, disliked,
							imported_from, original_id, imported_at, created_at)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					",
					params![
						&folder.id,
						"folder",
						parent_id,
						index,
						&folder.name,
						folder.description.as_deref().unwrap_or(""),
						folder.liked,
						folder.disliked,
						&folder.importedFrom,
						&folder.originalId,
						folder.dateImported,
						folder.dateCreated,
					],
				)
				.with_context(|| format!("Failed to insert playlist folder {}", folder.name))?;
			}
			TrackList::Playlist(playlist) => {
				let (index, parent_id) = parent_map
					.get(list_id.as_str())
					.with_context(|| format!("Parent of playlist {} not found", playlist.name))?;
				tx.execute(
					"
						INSERT INTO track_lists
							(id, kind, parent_id, item_pos, name, description, liked, disliked,
							imported_from, original_id, imported_at, created_at)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					",
					params![
						&playlist.id,
						"playlist",
						parent_id,
						index,
						&playlist.name,
						playlist.description.as_deref().unwrap_or(""),
						playlist.liked,
						playlist.disliked,
						&playlist.importedFrom,
						&playlist.originalId,
						playlist.dateImported,
						playlist.dateCreated,
					],
				)
				.with_context(|| format!("Failed to insert playlist {}", playlist.name))?;

				// playlist_tracks rows
				for (i, text_id) in playlist.tracks.iter().enumerate() {
					let track_id = new_ids.get(text_id.as_str()).unwrap();
					let i: u32 = i.try_into().unwrap();
					tx.execute(
						"INSERT INTO playlist_tracks (track_list_id, track_id, item_pos) VALUES (?, ?, ?)",
						params![&playlist.id, track_id, i],
					)
					.with_context(|| {
						format!(
							"Failed to insert track {} in playlist {}",
							track_id, playlist.name
						)
					})?;
				}
			}
		}
	}

	tx.commit().context("Failed to commit transaction")?;
	Ok(())
}

/// Returns a map of playlist -> (index, parent_id) for every tracklist entry.
fn build_parent_map(track_lists: &TrackLists) -> std::collections::HashMap<String, (i64, String)> {
	let mut map = std::collections::HashMap::new();
	for (parent_id, tl) in track_lists {
		let children = match tl {
			TrackList::Folder(f) => &f.children,
			TrackList::Special(s) => &s.children,
			TrackList::Playlist(_) => continue,
		};
		for (i, child_id) in children.iter().enumerate() {
			// SQLite does not support u64
			let i: i64 = i.try_into().unwrap();
			assert!(i >= 0);
			map.insert(child_id.clone(), (i, parent_id.clone()));
		}
	}
	map
}

mod old_library {
	#![allow(non_snake_case)]

	use anyhow::{Context, Result};
	use linked_hash_map::LinkedHashMap;
	use serde::Deserialize;
	use serde_json::{Value, json};
	use std::fs::File;
	use std::io::{ErrorKind, Read, Seek, SeekFrom};
	use std::path::PathBuf;

	pub fn load_library_json(library_json: &PathBuf) -> Result<Option<Library>> {
		let mut library_file = match File::open(&library_json) {
			Ok(file) => file,
			Err(err) => match err.kind() {
				ErrorKind::NotFound => return Ok(None),
				_ => return Err(err).context("Error opening library file"),
			},
		};

		let mut json_bytes = Vec::new();
		library_file
			.read_to_end(&mut json_bytes)
			.context("Error reading library file")?;

		let versioned_library: VersionedLibrary = match simd_json::from_slice(&mut json_bytes) {
			Ok(lib) => lib,
			Err(_) => {
				library_file
					.seek(SeekFrom::Start(0))
					.context("Error seeking to start of library file")?;
				let versioned_library = parse_old_versionless_library_json(&mut library_file)?;
				versioned_library
			}
		};

		let library = versioned_library.upgrade();
		Ok(Some(library))
	}

	fn parse_old_versionless_library_json(library_file: &mut File) -> Result<VersionedLibrary> {
		let mut json_str = String::new();
		library_file
			.read_to_string(&mut json_str)
			.context("Error reading library file")?;

		let mut value: Value =
			serde_json::from_str(&mut json_str).context("Error parsing library file")?;
		// Migrate version number to string
		if let Some(obj) = value.as_object_mut() {
			if let Some(version_field) = obj.get_mut("version") {
				if let Some(version) = version_field.as_number() {
					if version.as_u64() == Some(1) {
						*version_field = json!("1");
					} else if version.as_u64() == Some(2) {
						*version_field = json!("2");
					}
				}
			}
		}

		let versioned_library: VersionedLibrary =
			serde_json::from_value(value).context("Error parsing library file")?;
		Ok(versioned_library)
	}

	pub type Library = V2Library;

	#[derive(Deserialize, Clone, Debug)]
	#[serde(deny_unknown_fields)]
	pub struct V2Library {
		pub tracks: LinkedHashMap<TrackID, Track>,
		pub trackLists: TrackLists,
		// Playtimes were incorrect and overwritten after relaunch, so nothing to keep
		#[allow(unused)]
		v1PlayTime: Vec<PlayTime>,
		#[allow(unused)]
		playTime: Vec<PlayTime>,
	}

	#[derive(Deserialize, Clone, Debug)]
	#[serde(tag = "version", deny_unknown_fields)]
	enum VersionedLibrary {
		#[serde(rename = "1")]
		V1(V1Library),
		#[serde(rename = "2")]
		V2(V2Library),
	}
	impl VersionedLibrary {
		pub fn upgrade(self) -> V2Library {
			match self {
				VersionedLibrary::V1(v1) => v1.upgrade(),
				VersionedLibrary::V2(v2) => v2,
			}
		}
	}

	#[derive(Deserialize, Clone, Debug)]
	#[serde(deny_unknown_fields)]
	struct V1Library {
		tracks: LinkedHashMap<TrackID, Track>,
		trackLists: TrackLists,
		playTime: Vec<PlayTime>,
	}
	impl V1Library {
		fn upgrade<'a>(self) -> V2Library {
			V2Library {
				tracks: self.tracks,
				trackLists: self.trackLists,
				v1PlayTime: self.playTime,
				playTime: Vec::new(),
			}
		}
	}

	type TrackID = String;
	type TrackListID = String;
	type MsSinceUnixEpoch = i64;
	/// Should be 0-100
	type PercentInteger = u8;
	pub type TrackLists = LinkedHashMap<TrackListID, TrackList>;

	/// (track id, start time, duration)
	type PlayTime = (TrackID, MsSinceUnixEpoch, i64);

	#[derive(Deserialize, Clone, Debug)]
	pub struct Track {
		pub size: i64,
		pub duration: f64,
		pub bitrate: f64,
		pub sampleRate: f64,
		pub file: String,
		pub dateModified: MsSinceUnixEpoch,
		pub dateAdded: MsSinceUnixEpoch,
		pub name: String,
		#[serde(default)]
		pub importedFrom: Option<String>,
		/// Imported ID, like iTunes Persistent ID
		#[serde(default)]
		pub originalId: Option<String>,
		#[serde(default)]
		pub artist: String,
		#[serde(default)]
		pub composer: Option<String>,
		#[serde(default)]
		pub sortName: Option<String>,
		#[serde(default)]
		pub sortArtist: Option<String>,
		#[serde(default)]
		pub sortComposer: Option<String>,
		#[serde(default)]
		pub genre: Option<String>,
		#[serde(default)]
		pub rating: Option<PercentInteger>,
		#[serde(default)]
		pub year: Option<i64>,
		#[serde(default)]
		pub bpm: Option<f64>,
		#[serde(default)]
		pub comments: Option<String>,
		#[serde(default)]
		pub grouping: Option<String>,
		#[serde(default)]
		pub liked: Option<bool>,
		#[serde(default)]
		pub disliked: Option<bool>,
		#[serde(default)]
		pub disabled: Option<bool>,
		#[serde(default)]
		pub compilation: Option<bool>,
		#[serde(default)]
		pub albumName: Option<String>,
		#[serde(default)]
		pub albumArtist: Option<String>,
		#[serde(default)]
		pub sortAlbumName: Option<String>,
		#[serde(default)]
		pub sortAlbumArtist: Option<String>,
		#[serde(default)]
		pub trackNum: Option<u32>,
		#[serde(default)]
		pub trackCount: Option<u32>,
		#[serde(default)]
		pub discNum: Option<u32>,
		#[serde(default)]
		pub discCount: Option<u32>,
		#[serde(default)]
		pub dateImported: Option<MsSinceUnixEpoch>,
		#[serde(default)]
		pub playCount: Option<u32>,
		#[serde(default)]
		pub plays: Option<Vec<MsSinceUnixEpoch>>,
		#[serde(default)]
		pub playsImported: Option<Vec<CountObject>>,
		#[serde(default)]
		pub skipCount: Option<u32>,
		#[serde(default)]
		pub skips: Option<Vec<MsSinceUnixEpoch>>,
		#[serde(default)]
		pub skipsImported: Option<Vec<CountObject>>,
		/// -100 to 100
		#[serde(default)]
		pub volume: Option<i8>,
	}

	#[derive(Deserialize, Clone, Debug)]
	pub struct CountObject {
		pub count: i64,
		pub fromDate: MsSinceUnixEpoch,
		pub toDate: MsSinceUnixEpoch,
	}

	#[derive(Deserialize, Clone, Debug)]
	#[serde(tag = "type")]
	pub enum TrackList {
		#[serde(rename = "playlist")]
		Playlist(Playlist),
		#[serde(rename = "folder")]
		Folder(Folder),
		#[serde(rename = "special")]
		Special(Special),
	}

	#[derive(Deserialize, Clone, Debug)]
	pub struct Playlist {
		pub id: TrackListID,
		pub name: String,
		#[serde(default)]
		pub description: Option<String>,
		#[serde(default)]
		pub liked: bool,
		#[serde(default)]
		pub disliked: bool,
		#[serde(default)]
		pub importedFrom: Option<String>,
		#[serde(default)]
		pub originalId: Option<String>,
		#[serde(default)]
		pub dateImported: Option<MsSinceUnixEpoch>,
		#[serde(default)]
		pub dateCreated: Option<MsSinceUnixEpoch>,
		pub tracks: Vec<TrackID>,
	}

	#[derive(Deserialize, Clone, Debug)]
	pub struct Folder {
		pub id: TrackListID,
		pub name: String,
		#[serde(default)]
		pub description: Option<String>,
		#[serde(default)]
		pub liked: bool,
		#[serde(default)]
		pub disliked: bool,
		/// For example "itunes"
		#[serde(default)]
		pub importedFrom: Option<String>,
		/// For example iTunes Persistent ID
		#[serde(default)]
		pub originalId: Option<String>,
		#[serde(default)]
		pub dateImported: Option<MsSinceUnixEpoch>,
		#[serde(default)]
		pub dateCreated: Option<MsSinceUnixEpoch>,
		pub children: Vec<TrackListID>,
	}

	#[derive(Deserialize, Clone, Debug)]
	pub struct Special {
		pub id: TrackListID,
		pub name: SpecialTrackListName,
		pub dateCreated: MsSinceUnixEpoch,
		pub children: Vec<TrackListID>,
	}

	#[derive(Deserialize, Clone, Debug)]
	pub enum SpecialTrackListName {
		Root,
	}
	impl SpecialTrackListName {
		pub fn get_name_str(&self) -> &str {
			match self {
				SpecialTrackListName::Root => "root",
			}
		}
	}
}
