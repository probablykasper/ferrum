use crate::artists::load_artists;
use crate::library::{load_library, Paths};
use crate::library_types::{Library, TrackID, TrackList, TrackListID};
use crate::page::{get_track_ids, ViewAs};
use crate::sidebar_view::SidebarView;
use crate::sort::sort;
use crate::tracks::Tag;
use crate::{page, UniResult};
use atomicwrites::{AllowOverwrite, AtomicFile};
use napi::Result;
use serde::Serialize;
use std::collections::HashSet;
use std::env;
use std::io::Write;
use std::path::PathBuf;
use std::time::Instant;

pub struct Data {
	pub paths: Paths,
	pub is_dev: bool,
	pub library: Library,
	pub view_cache: SidebarView,
	/// All tracks on the current page, even if they are filtered out
	pub open_playlist_track_ids: Vec<TrackID>,
	/// The visible tracks on the current page
	pub page_track_ids: Option<Vec<TrackID>>,
	pub open_playlist_id: TrackListID,
	pub view_as: ViewAs,
	pub filter: String,
	pub sort_key: String,
	pub sort_desc: bool,
	pub group_album_tracks: bool,
	/// Current tag being edited
	pub current_tag: Option<Tag>,
	pub artists: HashSet<String>,
}

impl Data {
	pub fn save(&mut self) -> Result<()> {
		let mut now = Instant::now();
		let formatter = serde_json::ser::PrettyFormatter::with_indent(b"	"); // tab

		let mut json = Vec::new();
		let mut ser = serde_json::Serializer::with_formatter(&mut json, formatter);
		self.library.versioned().serialize(&mut ser)?;
		println!("Stringify: {}ms", now.elapsed().as_millis());

		now = Instant::now();
		let file_path = &self.paths.library_json;
		let af = AtomicFile::new(file_path, AllowOverwrite);
		let result = af.write(|f| f.write_all(&json));
		match result {
			Ok(_) => {}
			Err(err) => throw!("Error saving: {err}"),
		}
		println!("Write: {}ms", now.elapsed().as_millis());
		Ok(())
	}
	pub fn get_page_tracks(&self) -> &Vec<String> {
		match &self.page_track_ids {
			Some(ids) => ids,
			None => &self.open_playlist_track_ids,
		}
	}
	pub fn load(
		is_dev: bool,
		local_data_path: Option<String>,
		library_path: Option<String>,
	) -> UniResult<Data> {
		if is_dev {
			println!("Starting in dev mode");
		}
		let paths = if is_dev {
			let library_dir = match library_path {
				Some(path) => PathBuf::from(path),
				None => env::current_dir()
					.unwrap()
					.join("src-native")
					.join("appdata")
					.join("Library"),
			};
			Paths {
				library_dir: library_dir.clone(),
				tracks_dir: library_dir.join("Tracks"),
				library_json: library_dir.join("Library.json"),
				local_data_dir: match local_data_path {
					Some(path) => PathBuf::from(path),
					None => env::current_dir()
						.unwrap()
						.join("src-native")
						.join("appdata")
						.join("local_data"),
				},
			}
		} else {
			let library_dir = match library_path {
				Some(path) => PathBuf::from(path),
				None => {
					let music_dir = dirs::audio_dir().ok_or("Music folder not found")?;
					music_dir.join("Ferrum")
				}
			};
			Paths {
				library_dir: library_dir.clone(),
				tracks_dir: library_dir.join("Tracks"),
				library_json: library_dir.join("Library.json"),
				local_data_dir: match local_data_path {
					Some(path) => PathBuf::from(path),
					None => dirs::data_local_dir()
						.ok_or("Local data folder not found")?
						.join("space.kasper.ferrum"),
				},
			}
		};

		let loaded_library = load_library(&paths)?;
		let loaded_cache = SidebarView::load(&paths);
		let artists = load_artists(&loaded_library);

		let mut data = Data {
			is_dev,
			paths,
			library: loaded_library,
			artists,
			view_cache: loaded_cache,
			open_playlist_id: "root".to_string(),
			open_playlist_track_ids: vec![],
			view_as: ViewAs::Songs,
			page_track_ids: None,
			filter: "".to_string(),
			sort_key: "index".to_string(),
			sort_desc: true,
			group_album_tracks: true,
			current_tag: None,
		};
		data.open_playlist_track_ids = page::get_track_ids(&data)?;
		sort(&mut data, "dateAdded", true)?;
		return Ok(data);
	}
	pub fn open_playlist(&mut self, playlist_id: TrackID, view_as: Option<ViewAs>) -> Result<()> {
		self.open_playlist_id = playlist_id;
		self.view_as = view_as.unwrap_or_default();
		self.open_playlist_track_ids = get_track_ids(self)?;
		self.page_track_ids = None;
		match self.library.get_tracklist(&self.open_playlist_id)? {
			TrackList::Special(_) => {
				sort(self, "dateAdded", true)?;
			}
			_ => {
				self.sort_key = "index".to_string();
				self.sort_desc = true;
			}
		};
		Ok(())
	}
}
