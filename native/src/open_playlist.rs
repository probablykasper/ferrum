use crate::data::{Data, OpenPlaylistInfo};
use crate::data_js::get_data;
use crate::js::{arg_to_number, arg_to_string, nerr, nr};
use crate::library::{get_track_field_type, TrackField};
use crate::library_types::{SpecialTrackListName, TrackID, TrackList};
use crate::open_playlist;
use crate::sort::sort;
use napi::{CallContext, JsString, JsUndefined, JsUnknown, Result as NResult};
use napi_derive::js_function;

#[js_function(1)]
pub fn open_playlist(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  data.open_playlist_id = arg_to_string(&ctx, 0)?;
  data.open_playlist_track_ids = nr(open_playlist::get_track_ids(&data))?;
  let playlist = data
    .library
    .trackLists
    .get(&data.open_playlist_id)
    .ok_or(nerr("Playlist ID not found (2)"))?;
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

#[js_function(1)]
pub fn get_open_playlist_track(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let index: i64 = arg_to_number(&ctx, 0)?;
  let track_id = data
    .open_playlist_track_ids
    .get(index as usize)
    .ok_or(nerr(&format!(
      "Track index {} not found in open playlist",
      index.to_string()
    )))?;
  let track = data
    .library
    .tracks
    .get(track_id)
    .ok_or(nerr("Track ID not found"))?;
  let js = ctx.env.to_js_value(track)?;
  return Ok(js);
}

#[js_function(1)]
pub fn get_open_playlist_track_id(ctx: CallContext) -> NResult<JsString> {
  let data: &mut Data = get_data(&ctx)?;
  let index: i64 = arg_to_number(&ctx, 0)?;
  let track_id = data
    .open_playlist_track_ids
    .get(index as usize)
    .ok_or(nerr("Track index not found in open playlist"))?;
  return ctx.env.create_string(track_id);
}

#[js_function(0)]
pub fn refresh(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let sort_key = data.sort_key.clone();
  let sort_desc = data.sort_desc.clone();
  nr(sort(data, &sort_key, sort_desc))?;
  return ctx.env.get_undefined();
}

#[js_function(0)]
pub fn get_sorted_track_ids(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  return ctx.env.to_js_value(&data.open_playlist_track_ids);
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
pub fn get_open_playlist_info(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let info = OpenPlaylistInfo {
    id: data.open_playlist_id.clone(),
    sort_key: data.sort_key.clone(),
    sort_desc: data.sort_desc,
    length: data.open_playlist_track_ids.len(),
  };
  let js = ctx.env.to_js_value(&info)?;
  return Ok(js);
}

#[js_function(1)]
pub fn sort_js(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let sort_key = arg_to_string(&ctx, 0)?;

  let old_sort_key = &data.sort_key;
  if &sort_key == old_sort_key {
    data.open_playlist_track_ids.reverse();
    data.sort_desc = !data.sort_desc;
    return ctx.env.get_undefined();
  }

  let field = get_track_field_type(&sort_key);
  let desc = match field {
    Some(TrackField::String) => false,
    _ => true,
  };

  nr(sort(data, &sort_key, desc))?;
  return ctx.env.get_undefined();
}
