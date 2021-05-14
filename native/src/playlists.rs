use crate::data::Data;
use crate::data_js::get_data;
use crate::js::{arg_to_string, arg_to_string_vector};
use crate::library_types::TrackList;
use napi::{CallContext, JsUndefined, JsUnknown, Result as NResult};
use napi_derive::js_function;

#[js_function(0)]
pub fn get_track_lists(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let track_lists = &data.library.trackLists;
  let js = ctx.env.to_js_value(&track_lists)?;
  return Ok(js);
}

#[js_function(2)]
pub fn add_tracks(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let playlist_id = arg_to_string(&ctx, 0)?;
  let mut track_ids: Vec<String> = arg_to_string_vector(&ctx, 1)?;
  let tracklist = data
    .library
    .trackLists
    .get_mut(&playlist_id)
    .ok_or(nerr!("Playlist ID not found"))?;
  let playlist = match tracklist {
    TrackList::Playlist(playlist) => playlist,
    TrackList::Folder(_) => return Err(nerr!("Cannot add track to folder")),
    TrackList::Special(_) => return Err(nerr!("Cannot add track to special playlist")),
  };
  playlist.tracks.append(&mut track_ids);
  return ctx.env.get_undefined();
}
