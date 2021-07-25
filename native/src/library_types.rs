#![allow(non_snake_case)]

use linked_hash_map::LinkedHashMap;
use serde::{Deserialize, Serialize};
use serde_repr::{Deserialize_repr, Serialize_repr};

#[derive(Serialize, Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct Library {
  pub version: Version,
  pub tracks: LinkedHashMap<TrackID, Track>,
  pub trackLists: TrackLists,
  pub playTime: Vec<PlayTime>,
}

pub type TrackID = String;
pub type TrackListID = String;
pub type MsSinceUnixEpoch = i64;
/// Should be 0-100
pub type PercentInteger = u8;
pub type TrackLists = LinkedHashMap<TrackListID, TrackList>;

#[derive(Serialize_repr, Deserialize_repr, Debug)]
#[repr(u8)]
pub enum Version {
  V1 = 1,
}

/// (track id, start time, duration)
pub type PlayTime = (TrackID, MsSinceUnixEpoch, i64);

#[derive(Serialize, Deserialize, Debug)]
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
  /// Imported ID, like iTunes Persistent ID:
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
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub volume: Option<PercentInteger>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CountObject {
  count: i64,
  fromDate: MsSinceUnixEpoch,
  toDate: MsSinceUnixEpoch,
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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Playlist {
  pub id: TrackListID,
  pub name: String,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub liked: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub disliked: Option<String>,
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
pub struct Folder {
  pub id: TrackListID,
  pub name: String,
  #[serde(default)]
  pub show: bool,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub liked: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub disliked: Option<String>,
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
pub struct Special {
  pub id: TrackListID,
  pub name: SpecialTrackListName,
  pub dateCreated: MsSinceUnixEpoch,
  pub children: Vec<TrackListID>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum SpecialTrackListName {
  Root,
}
