use crate::data::{get_open_playlist_tracks, OpenPlaylistInfo};
use crate::data::{load_data, Data};
use crate::js::{arg_to_bool, arg_to_number, arg_to_string, nerr, nr};
use crate::library_types::TrackList;
use crate::player::*;
use crate::sort::sort;
use napi::threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunctionCallMode};
use napi::{CallContext, JsFunction, JsObject, JsUndefined, JsUnknown, Result as NResult};
use napi_derive::js_function;
use std::time::Instant;

fn get_data<'a>(ctx: &'a CallContext) -> NResult<&'a mut Data> {
  let this: JsObject = ctx.this()?;
  let data: &mut Data = ctx.env.unwrap(&this)?;
  return Ok(data)
}

#[js_function(2)]
pub fn load_data_js(ctx: CallContext) -> NResult<JsObject> {
  let is_dev = arg_to_bool(&ctx, 0)?;
  let func: JsFunction = ctx.get(1)?;

  let tsfn = ctx.env
    .create_threadsafe_function(&func, 0, |ctx: ThreadSafeCallContext<Vec<Event>>| {
      let arr: NResult<Vec<JsUnknown>> = ctx.value.iter()
        .map(|v| {
          return ctx.env.to_js_value(&*v)
        })
        .collect();
      return arr
    })?;
  let event_handler = move|event| {
    let output: Vec<Event> = vec![event];
    tsfn.call(Ok(output), ThreadsafeFunctionCallMode::Blocking);
  };

  let data: Data = nr(load_data(&is_dev, event_handler))?;

  let mut new_this: JsObject = ctx.env.create_object()?;
  ctx.env.wrap(&mut new_this, data)?;
  new_this = init_data_instance(new_this)?;
  return Ok(new_this)
}

#[js_function]
fn get_track_lists(ctx: CallContext) -> NResult<JsUnknown> {
  let now = Instant::now();
  let data: &mut Data = get_data(&ctx)?;
  let track_lists = &data.library.trackLists;
  let js = ctx.env.to_js_value(&track_lists)?;
  println!("Get track lists: {}ms", now.elapsed().as_millis());
  return Ok(js)
}

#[js_function(1)]
pub fn set_open_playlist_id(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  data.open_playlist_id = arg_to_string(&ctx, 0)?;
  data.open_playlist_track_ids = nr(get_open_playlist_tracks(data))?;
  let playlist = data.library.trackLists.get(&data.open_playlist_id)
    .ok_or(nerr("Playlist ID not found (2)"))?;
  match playlist {
    TrackList::Special(_) => {
      data.sort_key = "index".to_string();
      data.sort_desc = true;
      nr(sort(data, "dateAdded"))?;
    },
    _ => {
      data.sort_key = "index".to_string();
      data.sort_desc = true;
    },
  };
  return ctx.env.get_undefined()
}

#[js_function(1)]
pub fn get_open_playlist_track(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let index: i64 = arg_to_number(&ctx, 0)?;
  let track_id = data.open_playlist_track_ids.get(index as usize)
    .ok_or(nerr(&format!("Track index {} not found in open playlist", index.to_string())))?;
  let track = data.library.tracks.get(track_id)
    .ok_or(nerr("Track ID not found"))?;
  let js = ctx.env.to_js_value(track)?;
  return Ok(js)
}

#[js_function]
pub fn get_open_playlist_track_ids(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let js = ctx.env.to_js_value(&data.open_playlist_track_ids)?;
  return Ok(js)
}

#[js_function]
pub fn get_open_playlist_info(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let info = OpenPlaylistInfo {
    id: data.open_playlist_id.clone(),
    sort_key: data.sort_key.clone(),
    sort_desc: data.sort_desc,
    length: data.open_playlist_track_ids.len(),
  };
  let js = ctx.env.to_js_value(&info)?;
  return Ok(js)
}

#[js_function(1)]
pub fn sort_js(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let sort_key = arg_to_string(&ctx, 0)?;
  nr(sort(data, &sort_key))?;
  return ctx.env.get_undefined()
}

#[js_function(1)]
pub fn play_open_playlist_index(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let index: i64 = arg_to_number(&ctx, 0)?;
  let track_id = data.open_playlist_track_ids.get(index as usize)
    .ok_or(nerr("Track index not found in open playlist"))?.to_string();
  nr(play_id(data, &track_id))?;
  return ctx.env.get_undefined()
}

#[js_function(0)]
pub fn play_pause_js(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  nr(play_pause(data))?;
  return ctx.env.get_undefined()
}

#[js_function(0)]
pub fn close(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  data.player.sender.send(Message::Quit).expect("Error sending Quit event");
  return ctx.env.get_undefined()
}

fn init_data_instance(mut exports: JsObject) -> NResult<JsObject> {
  exports.create_named_method("get_track_lists", get_track_lists)?;
  exports.create_named_method("set_open_playlist_id", set_open_playlist_id)?;
  exports.create_named_method("get_open_playlist_track", get_open_playlist_track)?;
  exports.create_named_method("get_open_playlist_track_ids", get_open_playlist_track_ids)?;
  exports.create_named_method("get_open_playlist_info", get_open_playlist_info)?;
  exports.create_named_method("play_open_playlist_index", play_open_playlist_index)?;
  exports.create_named_method("play_pause", play_pause_js)?;
  exports.create_named_method("close", close)?;
  exports.create_named_method("sort", sort_js)?;

  return Ok(exports)
}
