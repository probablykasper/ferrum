use crate::data::{get_open_playlist_tracks, Data};
use crate::library::{get_track_field_type, TrackField};
use crate::library_types::{Track, TrackList};
use alphanumeric_sort::compare_str;
use std::cmp::Ordering;
use std::time::Instant;

// fn merge(l_arr: &[String], r_arr: &[String], sorted: &mut [String]) {
//   // Current loop position in left half, right half, and sorted vector
//   let (mut left, mut right, mut i) = (0, 0, 0);

//   while left < l_arr.len() && right < r_arr.len() {
//     if l_arr[left] <= r_arr[right] {
//       sorted[i] = l_arr[left];
//       i += 1;
//       left += 1;
//     } else {
//       sorted[i] = r_arr[right];
//       i += 1;
//       right += 1;
//     }
//   }

//   if left < l_arr.len() {
//     // If there is anything left in the left half append it after sorted members
//     sorted[i..].copy_from_slice(&l_arr[left..]);
//   }

//   if right < r_arr.len() {
//     // If there is anything left in the right half append it after sorted members
//     sorted[i..].copy_from_slice(&r_arr[right..]);
//   }
// }

// fn merge_sort(array: &mut [String], compareFunc: &Fn() -> ()) {
//   if array.len() <= 1 {
//     return
//   }
//   let middle = array.len() / 2;

//   merge_sort(&mut array[..middle], compareFunc);
//   merge_sort(&mut array[middle..], compareFunc);

//   let mut sorted = array.to_vec();
//   merge(&array[..middle], &array[middle..], &mut sorted);

//   array.copy_from_slice(&sorted);
// }

fn get_field_str<'a>(track: &'a Track, sort_key: &str) -> Option<&'a String> {
  match sort_key {
    "file" => Some(&track.file),
    "name" => track.name.as_ref(),
    "importedFrom" => track.importedFrom.as_ref(),
    "originalId" => track.originalId.as_ref(),
    "artist" => track.artist.as_ref(),
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
    _ => panic!("Field type not found for {}", sort_key),
  }
}

fn get_field_i32(track: &Track, sort_key: &str) -> Option<i32> {
  match sort_key {
    "playCount" => track.playCount,
    "skipCount" => track.skipCount,
    _ => panic!("Field type not found for {}", sort_key),
  }
}

fn get_field_i16(track: &Track, sort_key: &str) -> Option<i16> {
  match sort_key {
    "year" => track.year,
    "trackNum" => track.trackNum,
    "trackCount" => track.trackCount,
    "discNum" => track.discNum,
    "discCount" => track.discCount,
    _ => panic!("Field type not found for {}", sort_key),
  }
}

fn get_field_u8(track: &Track, sort_key: &str) -> Option<u8> {
  match sort_key {
    "rating" => track.rating,
    "volume" => track.volume,
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

pub fn sort<'a>(data: &'a mut Data, sort_key: &str) -> Result<(), &'static str> {
  let now = Instant::now();
  let old_sort_key = &data.sort_key;
  if sort_key == old_sort_key {
    data.open_playlist_track_ids.reverse();
    data.sort_desc = !data.sort_desc;
    return Ok(());
  }
  // let desc = match sort_key {
  //   // alphabetical columns should be asc (A-Z)
  //   "name" => false,
  //   "artist" => false,
  //   "composer" => false,
  //   "albumName" => false,
  //   "albumArtist" => false,
  //   "sortName" => false,
  //   "sortArtist" => false,
  //   "sortComposer" => false,
  //   "sortAlbumName" => false,
  //   "sortAlbumArtist" => false,
  //   "file" => false,
  //   "importedFrom" => false,
  //   "originalId" => false,
  //   "genre" => false,
  //   "comments" => false,
  //   "grouping" => false,
  //   // numerical and bool columns should be desc
  //   _ => true,
  // };

  if sort_key == "index" {
    // No need to sort for index. Indexes descend from "first to last"
    // instead of "high to low", so it needs to be reversed
    let playlist = data
      .library
      .trackLists
      .get(&data.open_playlist_id)
      .ok_or("Playlist ID not found (2)")?;
    match playlist {
      TrackList::Playlist(_) => {
        data.open_playlist_track_ids = get_open_playlist_tracks(data)?;
        data.sort_key = "index".to_string();
        data.sort_desc = true;
        println!("Sort: {}ms", now.elapsed().as_millis());
        return Ok(());
      }
      TrackList::Folder(_) | TrackList::Special(_) => return Ok(()),
    }
  }

  let tracks = &data.library.tracks;
  let field = get_track_field_type(sort_key);
  let mut desc = true;
  data.open_playlist_track_ids.sort_by(|id_a, id_b| {
    let track_a = tracks.get(id_a).expect("Track ID non-existant (1)");
    let track_b = tracks.get(id_b).expect("Track ID non-existant (2)");
    match field {
      Some(TrackField::String) => {
        desc = false;
        let default_str = "".to_string();
        let str_a = get_field_str(track_a, sort_key).unwrap_or(&default_str);
        let str_b = get_field_str(track_b, sort_key).unwrap_or(&default_str);
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
      Some(TrackField::I32) => {
        let num_a = get_field_i32(track_a, sort_key).unwrap_or(0);
        let num_b = get_field_i32(track_b, sort_key).unwrap_or(0);
        return num_a.cmp(&num_b);
      }
      Some(TrackField::I16) => {
        let num_a = get_field_i16(track_a, sort_key).unwrap_or(0);
        let num_b = get_field_i16(track_b, sort_key).unwrap_or(0);
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
        // return Err(format!("Field type not found for {}", sort_key))
        panic!("Field type not found for {}", sort_key)
      }
    }
  });
  // let field = get_track_field(sort_key);
  // data.open_playlist_track_ids.sort_by(|id_a, id_b| {
  //   let track_a = tracks.get(id_a).expect("Track ID non-existant (1)");
  //   let track_b = tracks.get(id_b).expect("Track ID non-existant (2)");
  //   match field {
  //     TrackFields::Size => {}
  //     TrackFields::Duration => {}
  //     TrackFields::Bitrate => {}
  //     TrackFields::SampleRate => {}
  //     TrackFields::File => {}
  //     TrackFields::DateModified => {}
  //     TrackFields::DateAdded => {}
  //     TrackFields::Name => {}
  //     TrackFields::ImportedFrom => {}
  //     TrackFields::OriginalId => {}
  //     TrackFields::Artist => {}
  //     TrackFields::Composer => {}
  //     TrackFields::SortName => {}
  //     TrackFields::SortArtist => {}
  //     TrackFields::SortComposer => {}
  //     TrackFields::Genre => {}
  //     TrackFields::Rating => {}
  //     TrackFields::Year => {}
  //     TrackFields::Bpm => {}
  //     TrackFields::Comments => {}
  //     TrackFields::Grouping => {}
  //     TrackFields::Liked => {}
  //     TrackFields::Disliked => {}
  //     TrackFields::Disabled => {}
  //     TrackFields::Compilation => {}
  //     TrackFields::AlbumName => {}
  //     TrackFields::AlbumArtist => {}
  //     TrackFields::SortAlbumName => {}
  //     TrackFields::SortAlbumArtist => {}
  //     TrackFields::TrackNum => {}
  //     TrackFields::TrackCount => {}
  //     TrackFields::DiscNum => {}
  //     TrackFields::DiscCount => {}
  //     TrackFields::DateImported => {}
  //     TrackFields::PlayCount => {}
  //     TrackFields::SkipCount => {}
  //     TrackFields::Volume => {}
  //     Some(XTrackField::String) => {
  //       match sort_key {
  //       }
  //     },
  //     Some(TrackField::F64) => {
  //     },
  //     Some(TrackField::I64) => {
  //     },
  //     Some(TrackField::I32) => {
  //     },
  //     Some(TrackField::I16) => {
  //     },
  //     Some(TrackField::U8) => {
  //     },
  //     Some(TrackField::Bool) => {
  //     },
  //     None => {
  //       return Err(format!("Field type not found for {}", sort_key))
  //     },
  //   }
  // });

  // data.open_playlist_track_ids.sort_by(|id_a, id_b| {
  //   let track_a = match tracks.get(id_a) {
  //     Some(track) => track,
  //     None => panic!("Track ID does not exist (1)"),
  //   };
  //   let track_b = match tracks.get(id_b) {
  //     Some(track) => track,
  //     None => panic!("Track ID does not exist (2)"),
  //   };
  //   let field_a = match get_field(track_a, sort_key) {
  //     Some(field) => field,
  //     None => return Ordering::Equal, //? Gotta change this
  //   };
  //   let field_b = match get_field(track_b, sort_key) {
  //     Some(field) => field,
  //     None => return Ordering::Equal, //? Gotta change this
  //   };
  //   let x = match (field_a, field_b) {
  //     (TrackField::String(str_a), TrackField::String(str_b)) => {
  //       compare_str(str_a, str_b)
  //     },
  //     (TrackField::I64(num_a), TrackField::I64(num_b)) => {
  //       num_a.cmp(&num_b)
  //     },
  //     (TrackField::I32(num_a), TrackField::I32(num_b)) => {
  //       num_a.cmp(&num_b)
  //     },
  //     (TrackField::I16(num_a), TrackField::I16(num_b)) => {
  //       num_a.cmp(&num_b)
  //     },
  //     (TrackField::U8(num_a), TrackField::U8(num_b)) => {
  //       num_a.cmp(&num_b)
  //     },
  //     (TrackField::F64(num_a), TrackField::F64(num_b)) => {
  //       match num_a.partial_cmp(&num_b) {
  //         Some(v) => v,
  //         None => Ordering::Equal //? Change this? NaN
  //       }
  //     },
  //     (TrackField::Bool(num_a), TrackField::Bool(num_b)) => {
  //       num_a.cmp(&num_b)
  //     },
  //     (_, _) => Ordering::Equal,
  //   };
  //   logged = true;
  //   return x
  // });
  if desc {
    data.open_playlist_track_ids.reverse();
  }
  data.sort_key = sort_key.to_string();
  data.sort_desc = desc;
  println!("Sort: {}ms", now.elapsed().as_millis());
  return Ok(());
}
