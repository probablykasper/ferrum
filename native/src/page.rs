use std::collections::HashSet;
use std::time::Instant;

use crate::data::Data;
use crate::data_js::get_data;
use crate::js::{arg_to_bool, arg_to_number, arg_to_number_vector, arg_to_string, nerr};
use crate::library::{get_track_field_type, TrackField};
use crate::library_types::{SpecialTrackListName, TrackID, TrackList};
use crate::sort::sort;
use crate::{filter, UniResult};
use napi::{CallContext, JsObject, JsString, JsUndefined, JsUnknown, Result as NResult};
use napi_derive::js_function;

#[js_function(1)]
pub fn open_playlist(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let id = arg_to_string(&ctx, 0)?;
  match data.library.get_tracklist(&id)? {
    TrackList::Special(_) => {
      sort(data, "dateAdded", true)?;
    }
    _ => {
      data.sort_key = "index".to_string();
      data.sort_desc = true;
    }
  };
  data.open_playlist_id = id;
  data.open_playlist_track_ids = get_track_ids(&data)?;
  data.page_track_ids = None;
  return ctx.env.get_undefined();
}

#[js_function(1)]
pub fn get_page_track(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let index: i64 = arg_to_number(&ctx, 0)?;
  let page_track_ids = data.get_page_tracks();
  let track_id = page_track_ids.get(index as usize).ok_or(nerr!(
    "Track index {} not found in open playlist",
    index.to_string()
  ))?;
  let tracks = &data.library.tracks;
  let track = tracks.get(track_id).ok_or(nerr("Track ID not found"))?;
  let js = ctx.env.to_js_value(track)?;
  return Ok(js);
}

#[js_function(1)]
pub fn get_page_track_id(ctx: CallContext) -> NResult<JsString> {
  let data: &mut Data = get_data(&ctx)?;
  let index: i64 = arg_to_number(&ctx, 0)?;
  let page_track_ids = data.get_page_tracks();
  let track_id = page_track_ids.get(index as usize).ok_or(nerr!(
    "Track index {} not found in open playlist",
    index.to_string()
  ))?;
  return ctx.env.create_string(track_id);
}

#[js_function(0)]
pub fn refresh(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let sort_key = data.sort_key.clone();
  let sort_desc = data.sort_desc.clone();
  sort(data, &sort_key, sort_desc)?;
  filter::filter(data, data.filter.clone());
  return ctx.env.get_undefined();
}

#[js_function(0)]
pub fn get_page_track_ids(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let page_track_ids = data.get_page_tracks();
  return ctx.env.to_js_value(page_track_ids);
}

fn get_tracklist_track_ids(data: &Data, playlist_id: &str) -> UniResult<Vec<TrackID>> {
  match data.library.get_tracklist(playlist_id)? {
    TrackList::Playlist(playlist) => {
      let ids = playlist
        .tracks
        .iter()
        .map(|track_id| track_id.to_string())
        .collect();
      Ok(ids)
    }
    TrackList::Folder(folder) => {
      let mut ids: HashSet<TrackID> = HashSet::new();
      for child in &folder.children {
        let child_ids = get_tracklist_track_ids(data, &child)?;
        ids.extend(child_ids);
      }
      Ok(ids.into_iter().collect())
    }
    TrackList::Special(special) => match special.name {
      SpecialTrackListName::Root => {
        let track_keys = data.library.tracks.keys();
        let ids = track_keys.map(|track| track.to_string()).collect();
        Ok(ids)
      }
    },
  }
}
pub fn get_track_ids(data: &Data) -> UniResult<Vec<TrackID>> {
  let now = Instant::now();
  let ids = get_tracklist_track_ids(data, &data.open_playlist_id)?;
  println!("Load page tracks: {}ms", now.elapsed().as_millis());
  Ok(ids)
}

#[js_function(0)]
pub fn get_page_info(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let tracklist = data.library.get_tracklist(&data.open_playlist_id)?;

  let v = serde_json::json!({
    "id": data.open_playlist_id,
    "tracklist": tracklist,
    "sort_key": data.sort_key,
    "sort_desc": data.sort_desc,
    "length": data.get_page_tracks().len(),
  });
  let js = ctx.env.to_js_value(&v)?;
  return Ok(js);
}

#[js_function(2)]
pub fn sort_js(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let sort_key = arg_to_string(&ctx, 0)?;
  let keep_filter = arg_to_bool(&ctx, 1)?;

  let old_sort_key = &data.sort_key;
  if &sort_key == old_sort_key {
    data.open_playlist_track_ids.reverse();
    data.sort_desc = !data.sort_desc;
  } else {
    let field = get_track_field_type(&sort_key);
    let desc = match field {
      Some(TrackField::String) => false,
      _ => true,
    };

    sort(data, &sort_key, desc)?;
  }

  if keep_filter {
    filter::filter(data, data.filter.clone());
  }
  return ctx.env.get_undefined();
}

#[js_function(2)]
pub fn move_tracks(ctx: CallContext) -> NResult<JsObject> {
  let data: &mut Data = get_data(&ctx)?;
  let mut indexes_to_move: Vec<u32> = arg_to_number_vector(&ctx, 0)?;
  indexes_to_move.sort_unstable();
  indexes_to_move.dedup();
  let to_index: u32 = arg_to_number(&ctx, 1)?;
  let tracklist = data
    .library
    .trackLists
    .get_mut(&data.open_playlist_id)
    .ok_or(nerr!("Playlist ID not found"))?;
  let playlist = match tracklist {
    TrackList::Playlist(playlist) => playlist,
    TrackList::Folder(_) => return Err(nerr!("Cannot rearrange tracks in folder")),
    TrackList::Special(_) => return Err(nerr!("Cannot rearrange tracks in special playlist")),
  };
  if data.sort_key != "index" || data.sort_desc != true {
    return Err(nerr!("Cannot rearrange when custom sorting is used"));
  }
  if data.filter != "" {
    return Err(nerr!("Cannot rearrange when filter is used"));
  }
  let mut start_ids = Vec::new();
  let mut moved_ids = Vec::new();
  let mut end_ids = Vec::new();

  let mut indexes_to_move = indexes_to_move.iter();
  let mut next_index = indexes_to_move.next().map(|n| *n as usize);
  for i in 0..playlist.tracks.len() {
    let id = playlist.tracks.remove(0);
    if Some(i) == next_index {
      next_index = indexes_to_move.next().map(|n| *n as usize);
      moved_ids.push(id);
    } else if i < to_index as usize {
      start_ids.push(id);
    } else {
      end_ids.push(id);
    }
  }
  let new_from = start_ids.len() as u32;
  let new_to = new_from + moved_ids.len() as u32 - 1;
  start_ids.append(&mut moved_ids);
  start_ids.append(&mut end_ids);
  playlist.tracks = start_ids;
  let mut new_selection = ctx.env.create_object()?;
  new_selection.set_named_property("from", ctx.env.create_uint32(new_from)?)?;
  new_selection.set_named_property("to", ctx.env.create_uint32(new_to)?)?;
  return Ok(new_selection);
}
