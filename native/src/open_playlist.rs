use crate::data::{get_open_playlist_tracks, Data, OpenPlaylistInfo};
use crate::data_js::get_data;
use crate::js::{arg_to_number, arg_to_string, nerr, nr};
use crate::library_types::TrackList;
use crate::sort::sort;
use napi::{CallContext, JsString, JsUndefined, JsUnknown, Result as NResult};
use napi_derive::js_function;

#[js_function(1)]
pub fn open_playlist(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  data.open_playlist_id = arg_to_string(&ctx, 0)?;
  data.open_playlist_track_ids = nr(get_open_playlist_tracks(data))?;
  let playlist = data
    .library
    .trackLists
    .get(&data.open_playlist_id)
    .ok_or(nerr("Playlist ID not found (2)"))?;
  match playlist {
    TrackList::Special(_) => {
      data.sort_key = "index".to_string();
      data.sort_desc = true;
      nr(sort(data, "dateAdded"))?;
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
pub fn get_open_playlist_track_ids(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let js = ctx.env.to_js_value(&data.open_playlist_track_ids)?;
  return Ok(js);
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
  nr(sort(data, &sort_key))?;
  return ctx.env.get_undefined();
}
