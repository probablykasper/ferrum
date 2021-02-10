use crate::data::{get_open_playlist_tracks, OpenPlaylistInfo};
use crate::data::{load_data, Data};
use crate::get_now_timestamp;
use crate::js::{arg_to_bool, arg_to_number, arg_to_string, nerr, nr};
use crate::library_types::Track;
use crate::library_types::TrackList;
use crate::sort::sort;
use napi::{CallContext, JsObject, JsString, JsUndefined, JsUnknown, Result as NResult};
use napi_derive::js_function;

fn get_data<'a>(ctx: &'a CallContext) -> NResult<&'a mut Data> {
  let this: JsObject = ctx.this()?;
  let data: &mut Data = ctx.env.unwrap(&this)?;
  return Ok(data);
}

fn id_arg_to_track<'a>(ctx: &'a CallContext, arg: usize) -> NResult<&'a mut Track> {
  let data: &mut Data = get_data(&ctx)?;
  let id = arg_to_string(&ctx, arg)?;
  let tracks = &mut data.library.tracks;
  let track = tracks.get_mut(&id).ok_or(nerr("Track ID not found"))?;
  return Ok(track);
}

#[js_function(1)]
pub fn load_data_js(ctx: CallContext) -> NResult<JsObject> {
  let is_dev = arg_to_bool(&ctx, 0)?;

  let data: Data = nr(load_data(&is_dev))?;

  let mut new_this: JsObject = ctx.env.create_object()?;
  ctx.env.wrap(&mut new_this, data)?;
  new_this = init_data_instance(new_this)?;
  return Ok(new_this);
}

#[js_function(0)]
pub fn get_paths(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let js_obj = ctx.env.to_js_value(&data.paths);
  return js_obj;
}

#[js_function(0)]
fn get_track_lists(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let track_lists = &data.library.trackLists;
  let js = ctx.env.to_js_value(&track_lists)?;
  return Ok(js);
}

#[js_function(1)]
pub fn get_track(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let id = arg_to_string(&ctx, 0)?;
  let tracks = &data.library.tracks;
  let track = tracks.get(&id).ok_or(nerr("Track ID not found"))?;
  let js = ctx.env.to_js_value(&track)?;
  return Ok(js);
}

#[js_function(1)]
pub fn add_play(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let track = id_arg_to_track(&ctx, 0)?;
  let timestamp = get_now_timestamp();
  match &mut track.plays {
    None => track.plays = Some(vec![timestamp]),
    Some(plays) => plays.push(timestamp),
  }
  match &mut track.playCount {
    None => track.playCount = Some(1),
    Some(play_count) => *play_count += 1,
  }
  data.save()?;
  return ctx.env.get_undefined();
}

#[js_function(1)]
pub fn add_skip(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let track = id_arg_to_track(&ctx, 0)?;
  let timestamp = get_now_timestamp();
  match &mut track.skips {
    None => track.skips = Some(vec![timestamp]),
    Some(skips) => skips.push(timestamp),
  }
  match &mut track.skipCount {
    None => track.skipCount = Some(1),
    Some(skip_count) => *skip_count += 1,
  }
  data.save()?;
  return ctx.env.get_undefined();
}

#[js_function(3)]
pub fn add_play_time(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let tracks = &mut data.library.tracks;
  let id = arg_to_string(&ctx, 0)?;
  tracks.get_mut(&id).ok_or(nerr("Track ID not found"))?;
  let timestamp: i64 = arg_to_number(&ctx, 1)?;
  let duration: i64 = arg_to_number(&ctx, 2)?;
  data.library.playTime.push((id, timestamp, duration));
  data.save()?;
  return ctx.env.get_undefined();
}

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

fn init_data_instance(mut exports: JsObject) -> NResult<JsObject> {
  exports.create_named_method("get_paths", get_paths)?;

  exports.create_named_method("get_track_lists", get_track_lists)?;

  exports.create_named_method("get_track", get_track)?;
  exports.create_named_method("add_play", add_play)?;
  exports.create_named_method("add_skip", add_skip)?;
  exports.create_named_method("add_play_time", add_play_time)?;

  exports.create_named_method("open_playlist", open_playlist)?;
  exports.create_named_method("get_open_playlist_track", get_open_playlist_track)?;
  exports.create_named_method("get_open_playlist_track_id", get_open_playlist_track_id)?;
  exports.create_named_method("get_open_playlist_track_ids", get_open_playlist_track_ids)?;
  exports.create_named_method("get_open_playlist_info", get_open_playlist_info)?;
  exports.create_named_method("sort", sort_js)?;

  return Ok(exports);
}
