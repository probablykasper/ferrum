use crate::data::Data;
use crate::data_js::get_data;
use crate::library_types::{Library, VersionedLibrary};
use anyhow::{Context, Result, bail};
use napi::Env;
use serde_json::{Value, json};
use std::fs::{File, create_dir_all};
use std::io::{ErrorKind, Read};
use std::path::PathBuf;
use std::time::Instant;

#[derive(Clone)]
#[napi(object)]
pub struct Paths {
	pub path_separator: String,
	pub library_dir: String,
	pub tracks_dir: String,
	pub library_json: String,
	pub cache_dir: String,
	pub cache_db: String,
	pub local_data_dir: String,
	pub view_options_file: String,
	pub logs_dir: String,
}
impl Paths {
	fn ensure_dirs_exists(&self) -> Result<()> {
		create_dir_all(&self.library_dir)?;
		create_dir_all(&self.tracks_dir)?;
		create_dir_all(&self.cache_dir)?;
		create_dir_all(&self.local_data_dir)?;
		// We do not create logs_dir, we create it lazily when a crash occurs
		return Ok(());
	}
	pub fn get_track_file_path(&self, file: &str) -> PathBuf {
		PathBuf::from(&self.tracks_dir).join(file)
	}
}

pub fn load_library(paths: &Paths) -> Result<Library> {
	let mut now = Instant::now();

	paths
		.ensure_dirs_exists()
		.context("Error ensuring folder exists")?;
	println!("Loading library at path: {}", paths.library_dir);

	let mut library_file = match File::open(&paths.library_json) {
		Ok(file) => file,
		Err(err) => match err.kind() {
			ErrorKind::NotFound => return Ok(Library::new()),
			_ => return Err(err).context("Error opening library file"),
		},
	};

	let mut json_str = String::new();
	library_file
		.read_to_string(&mut json_str)
		.context("Error reading library file")?;
	println!("Read library: {}ms", now.elapsed().as_millis());
	now = Instant::now();

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
	println!("Parse library: {}ms", now.elapsed().as_millis());

	let library = versioned_library.upgrade().init_libary();
	println!("Initialized library: {}ms", now.elapsed().as_millis());
	Ok(library)
}

pub enum TrackField {
	String,
	F64,
	I64,
	U32,
	I8,
	U8,
	Bool,
}

#[napi(js_name = "get_default_sort_desc")]
#[allow(dead_code)]
pub fn get_default_sort_desc(field: String) -> Result<bool> {
	if field == "index" {
		return Ok(true);
	}
	let field = get_track_field_type(&field)?;
	let desc = match field {
		TrackField::String => false,
		_ => true,
	};
	Ok(desc)
}

pub fn get_track_field_type(field: &str) -> Result<TrackField> {
	let field = match field {
		"size" => TrackField::I64,
		"duration" => TrackField::F64,
		"bitrate" => TrackField::F64,
		"sampleRate" => TrackField::F64,
		"file" => TrackField::String,
		"dateModified" => TrackField::I64,
		"dateAdded" => TrackField::I64,
		"name" => TrackField::String,
		"importedFrom" => TrackField::String,
		"originalId" => TrackField::String,
		"artist" => TrackField::String,
		"composer" => TrackField::String,
		"sortName" => TrackField::String,
		"sortArtist" => TrackField::String,
		"sortComposer" => TrackField::String,
		"genre" => TrackField::String,
		"rating" => TrackField::U8,
		"year" => TrackField::I64,
		"bpm" => TrackField::F64,
		"comments" => TrackField::String,
		"grouping" => TrackField::String,
		"liked" => TrackField::Bool,
		"disliked" => TrackField::Bool,
		"disabled" => TrackField::Bool,
		"compilation" => TrackField::Bool,
		"albumName" => TrackField::String,
		"albumArtist" => TrackField::String,
		"sortAlbumName" => TrackField::String,
		"sortAlbumArtist" => TrackField::String,
		"trackNum" => TrackField::U32,
		"trackCount" => TrackField::U32,
		"discNum" => TrackField::U32,
		"discCount" => TrackField::U32,
		"dateImported" => TrackField::I64,
		"playCount" => TrackField::U32,
		"skipCount" => TrackField::U32,
		"volume" => TrackField::I8,
		_ => bail!("Field type not found for {}", field),
	};
	return Ok(field);
}

#[napi(js_name = "get_genres")]
#[allow(dead_code)]
pub fn get_genres(env: Env) -> Vec<String> {
	let data: &mut Data = get_data(&env);
	let genres = data.library.get_genres();
	genres.clone()
}

#[napi(js_name = "get_artists")]
#[allow(dead_code)]
pub fn get_artists(env: Env) -> Vec<String> {
	let data: &mut Data = get_data(&env);
	let genres = data.library.get_artists();
	genres.clone()
}
