use crate::artists::load_artists;
use crate::library::{load_library, Paths};
use crate::library_types::Library;
use crate::tracks::Tag;
use crate::view_options::ViewOptions;
use crate::UniResult;
use atomicwrites::{AllowOverwrite, AtomicFile};
use dirs_next;
use napi::Result;
use serde::Serialize;
use std::collections::HashSet;
use std::env;
use std::io::Write;
use std::path::PathBuf;
use std::time::Instant;

pub struct Data {
	pub paths: Paths,
	pub library: Library,
	pub view_options: ViewOptions,
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
	pub fn load(
		is_dev: bool,
		local_data_path: Option<String>,
		library_path: Option<String>,
	) -> UniResult<Data> {
		if is_dev {
			println!("Starting in dev mode");
		}

		let library_dir;
		let cache_dir;
		let local_data_dir;
		if is_dev {
			let appdata_dev = env::current_dir().unwrap().join("src-native/appdata");
			library_dir = appdata_dev.join("Library");
			cache_dir = appdata_dev.join("Caches");
			local_data_dir = appdata_dev.join("LocalData/space.kasper.ferrum");
		} else {
			library_dir = dirs_next::audio_dir()
				.ok_or("Music folder not found")?
				.join("Ferrum");
			cache_dir = dirs_next::cache_dir()
				.ok_or("Cache folder not found")?
				.join("space.kasper.ferrum");
			local_data_dir = dirs_next::data_local_dir()
				.ok_or("Local data folder not found")?
				.join("space.kasper.ferrum");
		};
		let paths = Paths {
			library_dir: match library_path {
				Some(path) => PathBuf::from(path),
				None => library_dir.clone(),
			},
			tracks_dir: library_dir.join("Tracks"),
			library_json: library_dir.join("Library.json"),
			cache_dir: cache_dir.clone(),
			cache_db: cache_dir.join("Cache.redb"),
			local_data_dir: match local_data_path {
				Some(path) => PathBuf::from(path),
				None => local_data_dir,
			},
		};

		let loaded_library = load_library(&paths)?;
		let loaded_cache = ViewOptions::load(&paths);
		let artists = load_artists(&loaded_library);

		let data = Data {
			paths,
			library: loaded_library,
			artists,
			view_options: loaded_cache,
			current_tag: None,
		};
		return Ok(data);
	}
}
