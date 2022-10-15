use crate::data::Data;
use crate::library::{get_track_field_type, TrackField};
use crate::library_types::{Track, TrackList};
use crate::{page, UniResult};
use alphanumeric_sort::compare_str;
use std::cmp::Ordering;
use std::time::Instant;

fn get_field_str<'a>(track: &'a Track, sort_key: &str) -> Option<&'a String> {
  match sort_key {
    "file" => Some(&track.file),
    "name" => Some(&track.name),
    "importedFrom" => track.importedFrom.as_ref(),
    "originalId" => track.originalId.as_ref(),
    "artist" => Some(&track.artist),
    "composer" => track.composer.as_ref(),
    "sortName" => track.sortName.as_ref(),
    "sortArtist" => track.sortArtist.as_ref(),
    "sortComposer" => track.sortComposer.as_ref(),
    "genre" => track.genre.as_ref(),
    "comments" => track.comments.as_ref(),
    "grouping" => track.grouping.as_ref(),
    "albumName" => track.albumName.as_ref(),
    "albumArtist" => track.albumArtist.as_ref(),
    "sortAlbumName" => track.sortAlbumName.as_ref(),
    "sortAlbumArtist" => track.sortAlbumArtist.as_ref(),
    _ => panic!("Field type not found for {}", sort_key),
  }
}

fn get_field_f64(track: &Track, sort_key: &str) -> Option<f64> {
  match sort_key {
    "duration" => Some(track.duration),
    "bitrate" => Some(track.bitrate),
    "sampleRate" => Some(track.sampleRate),
    "bpm" => track.bpm,
    _ => panic!("Field type not found for {}", sort_key),
  }
}

fn get_field_i64(track: &Track, sort_key: &str) -> Option<i64> {
  match sort_key {
    "size" => Some(track.size),
    "dateModified" => Some(track.dateModified),
    "dateAdded" => Some(track.dateAdded),
    "dateImported" => track.dateImported,
    "year" => track.year,
    _ => panic!("Field type not found for {}", sort_key),
  }
}

fn get_field_u32(track: &Track, sort_key: &str) -> Option<u32> {
  match sort_key {
    "trackNum" => track.trackNum,
    "trackCount" => track.trackCount,
    "discNum" => track.discNum,
    "discCount" => track.discCount,
    "playCount" => track.playCount,
    "skipCount" => track.skipCount,
    _ => panic!("Field type not found for {}", sort_key),
  }
}

fn get_field_i8(track: &Track, sort_key: &str) -> Option<i8> {
  match sort_key {
    "volume" => track.volume,
    _ => panic!("Field type not found for {}", sort_key),
  }
}

fn get_field_u8(track: &Track, sort_key: &str) -> Option<u8> {
  match sort_key {
    "rating" => track.rating,
    _ => panic!("Field type not found for {}", sort_key),
  }
}

fn get_field_bool(track: &Track, sort_key: &str) -> Option<bool> {
  match sort_key {
    "liked" => track.liked,
    "disliked" => track.disliked,
    "disabled" => track.disabled,
    "compilation" => track.compilation,
    _ => panic!("Field type not found for {}", sort_key),
  }
}

pub fn sort(data: &mut Data, sort_key: &str, desc: bool) -> UniResult<()> {
  let now = Instant::now();

  if sort_key == "index" {
    // No need to sort for index. Indexes descend from "first to last"
    // instead of "high to low", so it needs to be reversed
    let playlist = data
      .library
      .trackLists
      .get(&data.open_playlist_id)
      .ok_or("Playlist ID not found")?;
    match playlist {
      TrackList::Playlist(_) => {
        data.open_playlist_track_ids = page::get_track_ids(&data)?;
        data.sort_key = sort_key.to_string();
        data.sort_desc = true;
        println!("Sort: {}ms", now.elapsed().as_millis());
        return Ok(());
      }
      TrackList::Folder(_) | TrackList::Special(_) => return Ok(()),
    }
  }

  data.open_playlist_track_ids = page::get_track_ids(&data)?;

  let tracks = &data.library.tracks;
  let field = get_track_field_type(sort_key);
  data.open_playlist_track_ids.sort_by(|id_a, id_b| {
    let track_a = tracks.get(id_a).expect("Track ID non-existant (1)");
    let track_b = tracks.get(id_b).expect("Track ID non-existant (2)");
    match field {
      Some(TrackField::String) => {
        let empty_str = &"".to_string();
        let str_a = get_field_str(track_a, sort_key).unwrap_or(empty_str);
        let str_b = get_field_str(track_b, sort_key).unwrap_or(empty_str);
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
      Some(TrackField::F64) => {
        let num_a = get_field_f64(track_a, sort_key).unwrap_or(0.0);
        let num_b = get_field_f64(track_b, sort_key).unwrap_or(0.0);
        match num_a.partial_cmp(&num_b) {
          Some(v) => v,
          None => panic!("Unable to compare f64 {} and {}", num_a, num_b),
        }
      }
      Some(TrackField::I64) => {
        let num_a = get_field_i64(track_a, sort_key).unwrap_or(0);
        let num_b = get_field_i64(track_b, sort_key).unwrap_or(0);
        return num_a.cmp(&num_b);
      }
      Some(TrackField::U32) => {
        let num_a = get_field_u32(track_a, sort_key).unwrap_or(0);
        let num_b = get_field_u32(track_b, sort_key).unwrap_or(0);
        return num_a.cmp(&num_b);
      }
      Some(TrackField::I8) => {
        let num_a = get_field_i8(track_a, sort_key).unwrap_or(0);
        let num_b = get_field_i8(track_b, sort_key).unwrap_or(0);
        return num_a.cmp(&num_b);
      }
      Some(TrackField::U8) => {
        let num_a = get_field_u8(track_a, sort_key).unwrap_or(0);
        let num_b = get_field_u8(track_b, sort_key).unwrap_or(0);
        return num_a.cmp(&num_b);
      }
      Some(TrackField::Bool) => {
        let bool_a = get_field_bool(track_a, sort_key).unwrap_or(false); //? look into this
        let bool_b = get_field_bool(track_b, sort_key).unwrap_or(false); //? look into this
        return bool_a.cmp(&bool_b);
      }
      None => {
        panic!("Field type not found for {}", sort_key)
      }
    }
  });
  if desc {
    data.open_playlist_track_ids.reverse();
  }
  data.sort_key = sort_key.to_string();
  data.sort_desc = desc;
  println!("Sort: {}ms", now.elapsed().as_millis());
  return Ok(());
}
