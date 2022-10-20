#![allow(non_snake_case)]

use crate::{get_now_timestamp, UniResult};
use linked_hash_map::LinkedHashMap;
use nanoid::nanoid;
use napi::bindgen_prelude::ToNapiValue;
use serde::{Deserialize, Serialize};
use serde_repr::{Deserialize_repr, Serialize_repr};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct Library {
  pub version: Version,
  pub tracks: LinkedHashMap<TrackID, Track>,
  pub trackLists: TrackLists,
  pub playTime: Vec<PlayTime>,
}

impl Library {
  pub fn new() -> Self {
    let mut track_lists = LinkedHashMap::new();
    let root = Special {
      id: "root".to_string(),
      name: SpecialTrackListName::Root,
      dateCreated: get_now_timestamp(),
      children: Vec::new(),
    };
    track_lists.insert("root".to_string(), TrackList::Special(root));
    Library {
      version: Version::V1,
      playTime: Vec::new(),
      tracks: LinkedHashMap::new(),
      trackLists: track_lists,
    }
  }
  pub fn generate_id(&self) -> String {
    let alphabet: [char; 32] = [
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r',
      's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '2', '3', '4', '5', '6', '7',
    ];
    for _ in 0..1000 {
      let id = nanoid!(7, &alphabet);
      if !self.tracks.contains_key(&id) && !self.trackLists.contains_key(&id) {
        return id;
      }
    }
    panic!("Error generating ID: Generated IDs already exist")
  }
  pub fn new_playlist(&self, name: String, description: Option<String>) -> Playlist {
    Playlist {
      id: self.generate_id(),
      name,
      description,
      liked: false,
      disliked: false,
      importedFrom: None,
      originalId: None,
      dateImported: None,
      dateCreated: Some(get_now_timestamp()),
      tracks: Vec::new(),
    }
  }
  pub fn new_folder(&self, name: String, description: Option<String>) -> Folder {
    Folder {
      id: self.generate_id(),
      name,
      description,
      liked: false,
      disliked: false,
      importedFrom: None,
      originalId: None,
      dateImported: None,
      dateCreated: Some(get_now_timestamp()),
      children: Vec::new(),
    }
  }
  pub fn get_track(&self, id: &str) -> UniResult<&Track> {
    match self.tracks.get(id) {
      Some(track) => Ok(track),
      None => throw!("Track with ID {} not found", id),
    }
  }
  pub fn get_tracklist(&self, id: &str) -> UniResult<&TrackList> {
    let tracklist = self.trackLists.get(id);
    Ok(tracklist.ok_or("Playlist ID not found")?)
  }
  pub fn get_tracklist_mut(&mut self, id: &str) -> UniResult<&mut TrackList> {
    let tracklist = self.trackLists.get_mut(id);
    Ok(tracklist.ok_or("Playlist ID not found")?)
  }
  pub fn get_root_tracklist_mut(&mut self) -> UniResult<&mut Special> {
    let tracklist = self.trackLists.get_mut("root");
    match tracklist {
      Some(TrackList::Special(special)) => match special.name {
        SpecialTrackListName::Root => Ok(special),
      },
      _ => throw!("Root playlist not found"),
    }
  }
  // pub fn get_parent_id(&self, id: &str) -> Option<String> {
  //   for (parent_id, tracklist) in &self.trackLists {
  //     let children = match tracklist {
  //       TrackList::Playlist(_) => continue,
  //       TrackList::Folder(list) => &list.children,
  //       TrackList::Special(list) => &list.children,
  //     };
  //     for child_id in children {
  //       if child_id == id {
  //         return Some(parent_id.to_string());
  //       }
  //     }
  //   }
  //   None
  // }
}

pub type TrackID = String;
pub type TrackListID = String;
pub type MsSinceUnixEpoch = i64;
/// Should be 0-100
pub type PercentInteger = u8;
pub type TrackLists = LinkedHashMap<TrackListID, TrackList>;

#[derive(Serialize_repr, Deserialize_repr, Debug)]
#[repr(u8)]
#[napi]
pub enum Version {
  V1 = 1,
}

/// (track id, start time, duration)
pub type PlayTime = (TrackID, MsSinceUnixEpoch, i64);

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct Track {
  pub size: i64,
  pub duration: f64,
  pub bitrate: f64,
  pub sampleRate: f64,
  pub file: String,
  pub dateModified: MsSinceUnixEpoch,
  pub dateAdded: MsSinceUnixEpoch,
  pub name: String,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub importedFrom: Option<String>,
  /// Imported ID, like iTunes Persistent ID
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub originalId: Option<String>,
  #[serde(default)]
  pub artist: String,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub composer: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub sortName: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub sortArtist: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub sortComposer: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub genre: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub rating: Option<PercentInteger>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub year: Option<i64>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub bpm: Option<f64>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub comments: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub grouping: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub liked: Option<bool>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub disliked: Option<bool>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub disabled: Option<bool>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub compilation: Option<bool>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub albumName: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub albumArtist: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub sortAlbumName: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub sortAlbumArtist: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub trackNum: Option<u32>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub trackCount: Option<u32>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub discNum: Option<u32>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub discCount: Option<u32>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub dateImported: Option<MsSinceUnixEpoch>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub playCount: Option<u32>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub plays: Option<Vec<MsSinceUnixEpoch>>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub playsImported: Option<Vec<CountObject>>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub skipCount: Option<u32>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub skips: Option<Vec<MsSinceUnixEpoch>>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub skipsImported: Option<Vec<CountObject>>,
  /// -100 to 100
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub volume: Option<i8>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct CountObject {
  pub count: i64,
  pub fromDate: MsSinceUnixEpoch,
  pub toDate: MsSinceUnixEpoch,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type")]
pub enum TrackList {
  #[serde(rename = "playlist")]
  Playlist(Playlist),
  #[serde(rename = "folder")]
  Folder(Folder),
  #[serde(rename = "special")]
  Special(Special),
}

impl TrackList {
  pub fn id(&self) -> &str {
    match self {
      TrackList::Playlist(list) => &list.id,
      TrackList::Folder(list) => &list.id,
      TrackList::Special(list) => &list.id,
    }
  }
}

fn is_false(value: &bool) -> bool {
  *value == true
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct Playlist {
  pub id: TrackListID,
  pub name: String,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,
  #[serde(default, skip_serializing_if = "is_false")]
  pub liked: bool,
  #[serde(default, skip_serializing_if = "is_false")]
  pub disliked: bool,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub importedFrom: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub originalId: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub dateImported: Option<MsSinceUnixEpoch>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub dateCreated: Option<MsSinceUnixEpoch>,
  pub tracks: Vec<TrackID>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct Folder {
  pub id: TrackListID,
  pub name: String,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,
  #[serde(default, skip_serializing_if = "is_false")]
  pub liked: bool,
  #[serde(default, skip_serializing_if = "is_false")]
  pub disliked: bool,
  /// For example "itunes"
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub importedFrom: Option<String>,
  /// For example iTunes Persistent ID
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub originalId: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub dateImported: Option<MsSinceUnixEpoch>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub dateCreated: Option<MsSinceUnixEpoch>,
  pub children: Vec<TrackListID>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct Special {
  pub id: TrackListID,
  pub name: SpecialTrackListName,
  pub dateCreated: MsSinceUnixEpoch,
  pub children: Vec<TrackListID>,
}

#[derive(Serialize, Deserialize, Debug)]
#[non_exhaustive]
#[napi]
pub enum SpecialTrackListName {
  Root,
}
