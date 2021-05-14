use crate::data::{Data, PageInfo};
use crate::data_js::get_data;
use crate::js::{arg_to_bool, arg_to_number, arg_to_number_vector, arg_to_string, nerr, nr};
use crate::library::{get_track_field_type, TrackField};
use crate::library_types::{SpecialTrackListName, TrackID, TrackList};
use crate::sort::sort;
use crate::{filter, page};
use napi::{CallContext, JsObject, JsString, JsUndefined, JsUnknown, Result as NResult};
use napi_derive::js_function;

#[js_function(1)]
pub fn open_playlist(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  data.open_playlist_id = arg_to_string(&ctx, 0)?;
  data.open_playlist_track_ids = nr(page::get_track_ids(&data))?;
  data.page_track_ids = None;
  let playlist = data
    .library
    .trackLists
    .get(&data.open_playlist_id)
    .ok_or(nerr("Playlist ID not found"))?;
  match playlist {
    TrackList::Special(_) => {
      nr(sort(data, "dateAdded", true))?;
    }
    _ => {
      data.sort_key = "index".to_string();
      data.sort_desc = true;
    }
  };
  return ctx.env.get_undefined();
}

fn get_page_tracks<'a>(data: &'a Data) -> &'a Vec<String> {
  let ids = match &data.page_track_ids {
    Some(ids) => ids,
    None => &data.open_playlist_track_ids,
  };
  return ids;
}

#[js_function(1)]
pub fn get_page_track(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let index: i64 = arg_to_number(&ctx, 0)?;
  let page_track_ids = get_page_tracks(data);
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
  let page_track_ids = get_page_tracks(data);
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
  nr(sort(data, &sort_key, sort_desc))?;
  filter::filter(data, data.filter.clone());
  return ctx.env.get_undefined();
}

#[js_function(0)]
pub fn get_page_track_ids(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let page_track_ids = get_page_tracks(data);
  return ctx.env.to_js_value(page_track_ids);
}

pub fn get_track_ids(data: &Data) -> Result<Vec<TrackID>, &'static str> {
  let playlist = data
    .library
    .trackLists
    .get(&data.open_playlist_id)
    .ok_or("Playlist ID not found")?;
  match playlist {
    TrackList::Playlist(playlist) => {
      let mut ids: Vec<TrackID> = Vec::new();
      for track_id in &playlist.tracks {
        ids.push(track_id.to_string());
      }
      return Ok(ids);
    }
    TrackList::Folder(_) => return Err("Cannot get length of folder"),
    TrackList::Special(special) => match special.name {
      SpecialTrackListName::Root => {
        let track_keys = data.library.tracks.keys();
        let mut ids: Vec<TrackID> = Vec::new();
        for track in track_keys {
          ids.push(track.to_string());
        }
        return Ok(ids);
      }
    },
  };
}

#[js_function(0)]
pub fn get_page_info(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let info = PageInfo {
    id: data.open_playlist_id.clone(),
    sort_key: data.sort_key.clone(),
    sort_desc: data.sort_desc,
    length: get_page_tracks(data).len(),
  };
  let js = ctx.env.to_js_value(&info)?;
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

    nr(sort(data, &sort_key, desc))?;
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
  if data.sort_key != "index" || data.sort_desc != true {
    return Err(nerr!("Cannot rearrange when custom sorting is used"));
  }
  let playlist = match tracklist {
    TrackList::Playlist(playlist) => playlist,
    TrackList::Folder(_) => return Err(nerr!("Cannot rearrange tracks in folder")),
    TrackList::Special(_) => return Err(nerr!("Cannot rearrange tracks in special playlist")),
  };
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
