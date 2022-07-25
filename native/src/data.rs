use crate::library::{load_library, Paths};
use crate::library_types::{Library, TrackID, TrackListID};
use crate::sort::sort;
use crate::tracks::Tag;
use crate::{page, UniResult};
use atomicwrites::{AllowOverwrite, AtomicFile};
use serde::Serialize;
use std::env;
use std::io::{Error, ErrorKind, Write};
use std::time::Instant;

pub struct Data {
  pub paths: Paths,
  pub is_dev: bool,
  pub library: Library,
  /// All tracks on the current page, even if they are filtered out
  pub open_playlist_track_ids: Vec<TrackID>,
  /// The visible tracks on the current page
  pub page_track_ids: Option<Vec<TrackID>>,
  pub open_playlist_id: TrackListID,
  pub filter: String,
  pub sort_key: String,
  pub sort_desc: bool,
  /// Current tag being edited
  pub current_tag: Option<Tag>,
}

impl Data {
  pub fn save(&mut self) -> Result<(), Error> {
    let mut now = Instant::now();
    let formatter = serde_json::ser::PrettyFormatter::with_indent(b"	"); // tab

    let mut json = Vec::new();
    let mut ser = serde_json::Serializer::with_formatter(&mut json, formatter);
    self.library.serialize(&mut ser)?;
    println!("Stringify: {}ms", now.elapsed().as_millis());

    now = Instant::now();
    let file_path = &self.paths.library_json;
    let af = AtomicFile::new(file_path, AllowOverwrite);
    let result = af.write(|f| f.write_all(&json));
    match result {
      Ok(_) => {}
      Err(err) => {
        return Err(Error::new(
          ErrorKind::Other,
          format!("Error saving: {}", err),
        ))
      }
    }
    println!("Write: {}ms", now.elapsed().as_millis());
    Ok(())
  }
  pub fn get_page_tracks<'a>(&'a self) -> &'a Vec<String> {
    match &self.page_track_ids {
      Some(ids) => &ids,
      None => &self.open_playlist_track_ids,
    }
  }
}

pub fn load_data(is_dev: bool) -> UniResult<Data> {
  let paths = if is_dev {
    let appdata_dir = env::current_dir().unwrap().join("appdata");
    let library_dir = appdata_dir.join("Library");
    Paths {
      library_dir: library_dir.clone(),
      tracks_dir: library_dir.join("Tracks"),
      library_json: library_dir.join("Library.json"),
  } else {
    let music_dir = dirs::audio_dir().ok_or("Music folder not found")?;
    let library_dir = music_dir.join("Ferrum");
    Paths {
      library_dir: library_dir.clone(),
      tracks_dir: library_dir.join("Tracks"),
      library_json: library_dir.join("Library.json"),
  };

  let loaded_library = load_library(&paths);

  let mut data = Data {
    is_dev: is_dev,
    paths: paths,
    library: loaded_library,
    open_playlist_id: "root".to_string(),
    open_playlist_track_ids: vec![],
    page_track_ids: None,
    filter: "".to_string(),
    sort_key: "index".to_string(),
    sort_desc: true,
    current_tag: None,
  };
  data.open_playlist_track_ids = page::get_track_ids(&data)?;
  sort(&mut data, "dateAdded", true)?;
  return Ok(data);
}
