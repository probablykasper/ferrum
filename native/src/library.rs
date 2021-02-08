use crate::library_types::Library;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use std::time::Instant;

pub fn load_library(path: &Path) -> Result<Library, &'static str> {
  let mut now = Instant::now();

  let mut json_str = String::new();
  File::open(path)
    .or(Err("Error opening library file"))?
    .read_to_string(&mut json_str)
    .or(Err("Error reading library file"))?;

  println!("Read library: {}ms", now.elapsed().as_millis());
  now = Instant::now();
  let library = match serde_json::from_str(&mut json_str) {
    Ok(library) => library,
    Err(err) => {
      println!("{:?}", err);
      return Err("Error parsing library file");
    }
  };

  println!("Parse library: {}ms", now.elapsed().as_millis());
  Ok(library)
}

pub enum TrackField {
  String,
  F64,
  I64,
  I32,
  I16,
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
    "year" => TrackField::I16,
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
    "trackNum" => TrackField::I16,
    "trackCount" => TrackField::I16,
    "discNum" => TrackField::I16,
    "discCount" => TrackField::I16,
    "dateImported" => TrackField::I64,
    "playCount" => TrackField::I32,
    "skipCount" => TrackField::I32,
    "volume" => TrackField::U8,
    _ => return None,
  };
  return Some(field);
}
