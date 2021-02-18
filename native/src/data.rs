use crate::library::{load_library, Paths};
use crate::library_types::TrackList::{Folder, Playlist, Special};
use crate::library_types::{Library, SpecialTrackListName, TrackID, TrackListID};
use crate::sort::sort;
use atomicwrites::{AllowOverwrite, AtomicFile};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::io::{Error, Write};
use std::time::Instant;

#[derive(Serialize, Deserialize)]
pub struct OpenPlaylistInfo {
  pub id: TrackListID,
  pub sort_key: String,
  pub sort_desc: bool,
  pub length: usize,
}

pub struct Data {
  pub paths: Paths,
  pub is_dev: bool,
  pub library: Library,
  pub open_playlist_track_ids: Vec<TrackID>,
  pub open_playlist_id: TrackListID,
  pub sort_key: String,
  pub sort_desc: bool,
}

impl Data {
  pub fn save(&mut self) -> Result<(), Error> {
    let mut now = Instant::now();
    let json_str = &serde_json::to_string_pretty(&self.library).unwrap();
    println!("Stringify: {}ms", now.elapsed().as_millis());

    now = Instant::now();
    let file_path = &self.paths.library_json;
    let af = AtomicFile::new(file_path, AllowOverwrite);
    af.write(|f| f.write_all(json_str.as_bytes()))?;
    println!("Write: {}ms", now.elapsed().as_millis());
    Ok(())
  }
}

pub fn make_id(library: &Library) -> String {
  let length = 7;
  for _i in 0..1000 {
    let mut id = "".to_owned();
    let characters = [
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r',
      's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '2', '3', '4', '5', '6', '7',
    ];
    let characters_len = characters.len();
    for _i in 1..length {
      let mut rng = rand::thread_rng();
      let rand_number = rng.gen_range(0..characters_len);
      let rand_char = characters
        .get(rand_number)
        .expect("Error generating ID: Char out of range");
      id.push(rand_char.clone());
    }
    if !library.tracks.contains_key(&id) {
      return id;
    }
  }
  panic!("Error generating ID: Generated IDs already exist")
}

pub fn get_open_playlist_tracks(data: &Data) -> Result<Vec<TrackID>, &'static str> {
  let playlist = data
    .library
    .trackLists
    .get(&data.open_playlist_id)
    .ok_or("Playlist ID not found")?;
  match playlist {
    Playlist(playlist) => return Ok(playlist.tracks.clone()),
    Folder(_) => return Err("Cannot get length of folder"),
    Special(special) => match special.name {
      SpecialTrackListName::Root => {
        let track_keys = data.library.tracks.keys();
        let mut list = vec![];
        for track in track_keys {
          list.push(track.clone());
        }
        return Ok(list);
      }
    },
  };
}

pub fn load_data(is_dev: &bool) -> Result<Data, &'static str> {
  let app_name = if *is_dev { "Ferrum Dev" } else { "Ferrum" };

  let music_dir = dirs::audio_dir().ok_or("Music folder not found")?;
  let library_dir = music_dir.join(app_name);
  let library_json_path = library_dir.clone().join("Library.json");

  let paths = Paths {
    library_dir: library_dir.clone(),
    tracks_dir: library_dir.join("Tracks"),
    artworks_dir: library_dir.join("Artworks"),
    library_json: library_json_path,
  };

  let loaded_library = load_library(&paths);

  let mut data = Data {
    is_dev: *is_dev,
    paths: paths,
    library: loaded_library,
    open_playlist_id: "root".to_string(),
    open_playlist_track_ids: vec![],
    sort_key: "index".to_string(),
    sort_desc: true,
  };
  data.open_playlist_track_ids = get_open_playlist_tracks(&data)?;
  // We need the new sort_key to be different. Otherwise sort() thinks it's
  // already sorted and just reverses it
  sort(&mut data, "dateAdded")?;
  return Ok(data);
}
