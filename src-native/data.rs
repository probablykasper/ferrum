use crate::library::{Paths, load_library};
use crate::library_types::Library;
use crate::tracks::Tag;
use anyhow::{Context, Result};
use atomicwrites::{AllowOverwrite, AtomicFile};
use dirs_next;
use serde::Serialize;
use std::env;
use std::io::Write;
use std::path::PathBuf;
use std::time::Instant;

pub struct Data {
	pub paths: Paths,
	pub library: Library,
	/// Current tag being edited
	pub current_tag: Option<Tag>,
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
		af.write(|f| f.write_all(&json)).context("Error saving")?;
		println!("Write: {}ms", now.elapsed().as_millis());
		Ok(())
	}
	pub fn load(
		is_dev: bool,
		local_data_path: Option<String>,
		library_path: Option<String>,
	) -> Result<Data> {
		if is_dev {
			println!("Starting in dev mode");
		}

		let mut library_dir;
		let cache_dir;
		let local_data_dir;
		if is_dev {
			let appdata_dev = env::current_dir().unwrap().join("src-native/appdata");
			library_dir = appdata_dev.join("Library");
			cache_dir = appdata_dev.join("Caches");
			local_data_dir = appdata_dev.join("LocalData/space.kasper.ferrum");
		} else {
			library_dir = dirs_next::audio_dir()
				.context("Music folder not found")?
				.join("Ferrum");
			cache_dir = dirs_next::cache_dir()
				.context("Cache folder not found")?
				.join("space.kasper.ferrum");
			local_data_dir = dirs_next::data_local_dir()
				.context("Local data folder not found")?
				.join("space.kasper.ferrum");
		};
		if let Some(library_path) = library_path {
			library_dir = PathBuf::from(library_path);
		}
		let paths = Paths {
			library_dir: library_dir.clone(),
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

		let data = Data {
			paths,
			library: loaded_library,
			current_tag: None,
		};
		return Ok(data);
	}
}
