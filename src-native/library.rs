use crate::library_types::Library;
use serde::{Deserialize, Serialize};
use std::fs::{create_dir_all, File};
use std::io::{Error, ErrorKind, Read};
use std::path::PathBuf;
use std::time::Instant;

#[derive(Serialize, Deserialize)]
pub struct Paths {
  pub library_dir: PathBuf,
  pub tracks_dir: PathBuf,
  pub library_json: PathBuf,
  pub local_data_dir: PathBuf,
}
impl Paths {
  fn ensure_dirs_exists(&self) -> Result<(), Error> {
    create_dir_all(&self.library_dir)?;
    create_dir_all(&self.tracks_dir)?;
    create_dir_all(&self.local_data_dir)?;
    return Ok(());
  }
}

pub fn load_library(paths: &Paths) -> Library {
  let mut now = Instant::now();

  match paths.ensure_dirs_exists() {
    Ok(_) => {}
    Err(err) => panic!("Error ensuring folder exists: {}", err),
  };

  match File::open(&paths.library_json) {
    Ok(mut file) => {
      let mut json_str = String::new();
      match file.read_to_string(&mut json_str) {
        Ok(_) => {}
        Err(err) => panic!("Error reading library file: {}", err),
      };
      println!("Read library: {}ms", now.elapsed().as_millis());
      now = Instant::now();

      let library = match serde_json::from_str(&mut json_str) {
        Ok(library) => library,
        Err(err) => panic!("Error parsing library file: {:?}", err),
      };

      println!("Parse library: {}ms", now.elapsed().as_millis());
      return library;
    }
    Err(err) => match err.kind() {
      ErrorKind::NotFound => {
        return Library::new();
      }
      _err_kind => panic!("Error opening library file: {}", err),
    },
  };
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

pub fn get_track_field_type(field: &str) -> Option<TrackField> {
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
    _ => return None,
  };
  return Some(field);
}
