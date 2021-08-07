use crate::data::Data;
use crate::data_js::get_data;
use crate::js::{arg_to_bool, arg_to_number_vector, arg_to_string, arg_to_string_vector};
use crate::library_types::{SpecialTrackListName, TrackList};
use crate::str_to_option;
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

#[js_function(1)]
pub fn remove_from_open(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let mut indexes_to_remove: Vec<u32> = arg_to_number_vector(&ctx, 0)?;
  indexes_to_remove.sort_unstable();
  indexes_to_remove.dedup();
  let open_playlist = data
    .library
    .trackLists
    .get_mut(&data.open_playlist_id)
    .ok_or(nerr!("Playlist ID not found"))?;
  let playlist = match open_playlist {
    TrackList::Playlist(playlist) => playlist,
    TrackList::Folder(_) => return Err(nerr!("Cannot remove track from folder")),
    TrackList::Special(_) => return Err(nerr!("Cannot remove track from special playlist")),
  };
  if data.sort_key != "index" || data.sort_desc != true {
    return Err(nerr!("Cannot remove track when custom sorting is used"));
  }
  if data.filter != "" {
    return Err(nerr!("Cannot remove track when filter is used"));
  }
  let mut new_list = Vec::new();
  let mut indexes_to_remove = indexes_to_remove.iter();
  let mut next_index = indexes_to_remove.next().map(|n| *n as usize);
  for i in 0..playlist.tracks.len() {
    let id = playlist.tracks.remove(0);
    if Some(i) == next_index {
      next_index = indexes_to_remove.next().map(|n| *n as usize);
    } else {
      new_list.push(id);
    }
  }
  playlist.tracks = new_list;
  return ctx.env.get_undefined();
}

#[js_function(4)]
pub fn new_playlist(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let library = &mut data.library;
  let name = arg_to_string(&ctx, 0)?;
  let description = arg_to_string(&ctx, 1)?;
  let is_folder = arg_to_bool(&ctx, 2)?;
  let parent_id = arg_to_string(&ctx, 3)?;

  let list = match is_folder {
    true => {
      let folder = library.new_folder(name, str_to_option(description));
      TrackList::Folder(folder)
    }
    false => {
      let playlist = library.new_playlist(name, str_to_option(description));
      TrackList::Playlist(playlist)
    }
  };

  let parent = match library.trackLists.get_mut(&parent_id) {
    Some(parent) => parent,
    None => return Err(nerr!("Parent not found")),
  };

  match parent {
    TrackList::Playlist(_) => return Err(nerr!("Parent cannot be playlist")),
    TrackList::Folder(folder) => {
      folder.children.push(list.id().to_string());
      library.trackLists.insert(list.id().to_string(), list);
    }
    TrackList::Special(special) => match special.name {
      SpecialTrackListName::Root => {
        special.children.push(list.id().to_string());
        library.trackLists.insert(list.id().to_string(), list);
      }
    },
  };

  return ctx.env.get_undefined();
}
