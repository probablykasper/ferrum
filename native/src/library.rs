use crate::library_types::Library;
use std::fs::File;
use std::io;
use std::io::{Read, Write};
use std::path::Path;
use std::time::Instant;
use tempfile::NamedTempFile;

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

fn atomic_file_save(file_path: &str, content: &str) -> Result<(), io::Error> {
  let mut tmpfile = NamedTempFile::new()?;
  write!(tmpfile, "{}", content)?;
  tmpfile.persist(file_path)?;
  Ok(())
}

#[allow(dead_code)]
pub fn save(library: &Library) -> Result<(), String> {
  let mut now = Instant::now();

  let json_str = &serde_json::to_string_pretty(library).unwrap();

  let file_path = "/Users/kasper/Downloads/serdesavedlib.json";
  println!("Stringify: {}ms", now.elapsed().as_millis());
  now = Instant::now();

  atomic_file_save(file_path, json_str).or(Err("Error saving file"))?;

  println!("Write: {}ms", now.elapsed().as_millis());
  Ok(())
}

// pub enum TrackField<'a> {
//   String(&'a String),
//   F64(f64),
//   I64(i64),
//   I32(i32),
//   I16(i16),
//   U8(u8),
//   Bool(bool),
// }

// pub fn get_field<'a> (track: &'a Track, sort_key: &str) -> Option<TrackField<'a>> {
//   use TrackField::{String, I64, I16, I32, F64, U8, Bool};
//   let to_str = |v: &'a std::string::String| { String(v) };
//   let to_i64 = |v| { I64(v) };
//   let to_i16 = |v| { I16(v) };
//   let to_i32 = |v| { I32(v) };
//   let to_f64 = |v| { F64(v) };
//   let to_u8 = |v| { U8(v) };
//   let to_bool = |v| { Bool(v) };
//   return match sort_key {
//     "size"            => Some(I64(track.size)),
//     "duration"        => Some(F64(track.duration)),
//     "bitrate"         => Some(F64(track.bitrate)),
//     "sampleRate"      => Some(F64(track.sampleRate)),
//     "file"            => Some(String(&track.file)),
//     "dateModified"    => Some(I64(track.dateModified)),
//     "dateAdded"       => Some(I64(track.dateAdded)),
//     "name"            => track.name.as_ref().map(to_str),
//     "importedFrom"    => track.importedFrom.as_ref().map(to_str),
//     "originalId"      => track.originalId.as_ref().map(to_str),
//     "artist"          => track.artist.as_ref().map(to_str),
//     "composer"        => track.composer.as_ref().map(to_str),
//     "sortName"        => track.sortName.as_ref().map(to_str),
//     "sortArtist"      => track.sortArtist.as_ref().map(to_str),
//     "sortComposer"    => track.sortComposer.as_ref().map(to_str),
//     "genre"           => track.genre.as_ref().map(to_str),
//     "rating"          => track.rating.map(to_u8),
//     "year"            => track.year.map(to_i16),
//     "bpm"             => track.bpm.map(to_f64),
//     "comments"        => track.comments.as_ref().map(to_str),
//     "grouping"        => track.grouping.as_ref().map(to_str),
//     "liked"           => track.liked.map(to_bool),
//     "disliked"        => track.disliked.map(to_bool),
//     "disabled"        => track.disabled.map(to_bool),
//     "compilation"     => track.compilation.map(to_bool),
//     "albumName"       => track.albumName.as_ref().map(to_str),
//     "albumArtist"     => track.albumArtist.as_ref().map(to_str),
//     "sortAlbumName"   => track.sortAlbumName.as_ref().map(to_str),
//     "sortAlbumArtist" => track.sortAlbumArtist.as_ref().map(to_str),
//     "trackNum"        => track.trackNum.map(to_i16),
//     "trackCount"      => track.trackCount.map(to_i16),
//     "discNum"         => track.discNum.map(to_i16),
//     "discCount"       => track.discCount.map(to_i16),
//     "dateImported"    => track.dateImported.map(to_i64),
//     "playCount"       => track.playCount.map(to_i32),
//     "skipCount"       => track.skipCount.map(to_i32),
//     "volume"          => track.volume.map(to_u8),
//     _ => None,
//   }
// }

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

// pub enum TrackFields {
//   Size,
//   Duration,
//   Bitrate,
//   SampleRate,
//   File,
//   DateModified,
//   DateAdded,
//   Name,
//   ImportedFrom,
//   OriginalId,
//   Artist,
//   Composer,
//   SortName,
//   SortArtist,
//   SortComposer,
//   Genre,
//   Rating,
//   Year,
//   Bpm,
//   Comments,
//   Grouping,
//   Liked,
//   Disliked,
//   Disabled,
//   Compilation,
//   AlbumName,
//   AlbumArtist,
//   SortAlbumName,
//   SortAlbumArtist,
//   TrackNum,
//   TrackCount,
//   DiscNum,
//   DiscCount,
//   DateImported,
//   PlayCount,
//   SkipCount,
//   Volume,
// }

// pub fn get_track_field(field: &str) -> Option<TrackFields> {
//   let field = match field {
//     "size"            => TrackFields::Size,
//     "duration"        => TrackFields::Duration,
//     "bitrate"         => TrackFields::Bitrate,
//     "sampleRate"      => TrackFields::SampleRate,
//     "file"            => TrackFields::File,
//     "dateModified"    => TrackFields::DateModified,
//     "dateAdded"       => TrackFields::DateAdded,
//     "name"            => TrackFields::Name,
//     "importedFrom"    => TrackFields::ImportedFrom,
//     "originalId"      => TrackFields::OriginalId,
//     "artist"          => TrackFields::Artist,
//     "composer"        => TrackFields::Composer,
//     "sortName"        => TrackFields::SortName,
//     "sortArtist"      => TrackFields::SortArtist,
//     "sortComposer"    => TrackFields::SortComposer,
//     "genre"           => TrackFields::Genre,
//     "rating"          => TrackFields::Rating,
//     "year"            => TrackFields::Year,
//     "bpm"             => TrackFields::Bpm,
//     "comments"        => TrackFields::Comments,
//     "grouping"        => TrackFields::Grouping,
//     "liked"           => TrackFields::Liked,
//     "disliked"        => TrackFields::Disliked,
//     "disabled"        => TrackFields::Disabled,
//     "compilation"     => TrackFields::Compilation,
//     "albumName"       => TrackFields::AlbumName,
//     "albumArtist"     => TrackFields::AlbumArtist,
//     "sortAlbumName"   => TrackFields::SortAlbumName,
//     "sortAlbumArtist" => TrackFields::SortAlbumArtist,
//     "trackNum"        => TrackFields::TrackNum,
//     "trackCount"      => TrackFields::TrackCount,
//     "discNum"         => TrackFields::DiscNum,
//     "discCount"       => TrackFields::DiscCount,
//     "dateImported"    => TrackFields::DateImported,
//     "playCount"       => TrackFields::PlayCount,
//     "skipCount"       => TrackFields::SkipCount,
//     "volume"          => TrackFields::Volume,
//     _ => return None,
//   };
//   return Some(field)
// }
