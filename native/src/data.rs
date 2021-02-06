use crate::library::load_library;
use crate::library_types::TrackList::{Folder, Playlist, Special};
use crate::library_types::{Library, SpecialTrackListName, TrackID, TrackListID};
use crate::sort::sort;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize)]
pub struct OpenPlaylistInfo {
  pub id: TrackListID,
  pub sort_key: String,
  pub sort_desc: bool,
  pub length: usize,
}

pub struct Paths {
  pub library_dir: PathBuf,
  pub tracks_dir: PathBuf,
  pub artworks_dir: PathBuf,
  pub library_json: PathBuf,
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

  let loaded_library = load_library(&library_json_path)?;

  let paths = Paths {
    library_dir: library_dir.clone(),
    tracks_dir: library_dir.join("Tracks"),
    artworks_dir: library_dir.join("Artworks"),
    library_json: library_json_path,
  };

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
