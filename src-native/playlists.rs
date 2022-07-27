use std::path::PathBuf;

use crate::data::Data;
use crate::data_js::get_data;
use crate::js::{arg_to_bool, arg_to_number_vector, arg_to_string, arg_to_string_vector};
use crate::library_types::{Library, SpecialTrackListName, TrackID, TrackList};
use crate::{str_to_option, UniResult};
use napi::{CallContext, JsUndefined, JsUnknown, Result as NResult};
use napi_derive::js_function;

#[cfg(target_os = "macos")]
use trash::macos::TrashContextExtMacos;

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
  let playlist = match data.library.get_tracklist_mut(&playlist_id)? {
    TrackList::Playlist(playlist) => playlist,
    TrackList::Folder(_) => throw!("Cannot add track to folder"),
    TrackList::Special(_) => throw!("Cannot add track to special playlist"),
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
  let playlist = match data.library.get_tracklist_mut(&data.open_playlist_id)? {
    TrackList::Playlist(playlist) => playlist,
    TrackList::Folder(_) => throw!("Cannot remove track from folder"),
    TrackList::Special(_) => throw!("Cannot remove track from special playlist"),
  };
  if data.sort_key != "index" || data.sort_desc != true {
    throw!("Cannot remove track when custom sorting is used");
  }
  if data.filter != "" {
    throw!("Cannot remove track when filter is used");
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

fn remove_from_all_playlists(library: &mut Library, id: &str) {
  for (_, tracklist) in &mut library.trackLists {
    let playlist = match tracklist {
      TrackList::Playlist(playlist) => playlist,
      _ => continue,
    };
    playlist.tracks.retain(|current_id| current_id != id);
  }
}

fn get_page_ids(data: &mut Data, indexes: Vec<u32>) -> UniResult<Vec<String>> {
  let mut ids = Vec::new();
  let page_track_ids = data.get_page_tracks();
  for index in indexes {
    let id = match page_track_ids.get(index as usize) {
      Some(id) => id,
      None => throw!("Track index not found"),
    };
    ids.push(id.clone());
  }
  Ok(ids)
}

fn delete_file(path: &PathBuf) -> UniResult<()> {
  #[allow(unused_mut)]
  let mut trash_context = trash::TrashContext::new();

  #[cfg(target_os = "macos")]
  trash_context.set_delete_method(trash::macos::DeleteMethod::NsFileManager);

  match trash_context.delete(&path) {
    Ok(_) => Ok(()),
    Err(_) => throw!("Failed moving file to trash: {}", path.to_string_lossy()),
  }
}

#[js_function(1)]
pub fn delete_tracks_in_open(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let ids_to_delete = {
    let mut indexes_to_delete: Vec<u32> = arg_to_number_vector(&ctx, 0)?;
    indexes_to_delete.sort_unstable();
    indexes_to_delete.dedup();
    get_page_ids(data, indexes_to_delete)?
  };
  let library = &mut data.library;

  for id_to_delete in &ids_to_delete {
    let file_path = {
      let track = library.get_track(id_to_delete)?;
      data.paths.tracks_dir.join(&track.file)
    };
    if !file_path.exists() {
      throw!("File does not exist: {}", file_path.to_string_lossy());
    }

    remove_from_all_playlists(library, &id_to_delete);
    library
      .tracks
      .remove(id_to_delete)
      .expect("Track ID not found when deleting");
    delete_file(&file_path)?;
  }
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
    None => throw!("Parent not found"),
  };

  match parent {
    TrackList::Playlist(_) => throw!("Parent cannot be playlist"),
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

fn get_all_tracklist_children(data: &Data, playlist_id: &str) -> UniResult<Vec<TrackID>> {
  let direct_children = match data.library.get_tracklist(playlist_id)? {
    TrackList::Folder(folder) => &folder.children,
    TrackList::Special(special) => &special.children,
    TrackList::Playlist(_) => return Ok(Vec::new()),
  };
  let mut all_children = Vec::new();
  for child_id in direct_children {
    all_children.push(child_id.clone());
    match data.library.get_tracklist(child_id)? {
      TrackList::Playlist(_) => {}
      TrackList::Folder(folder) => {
        all_children.extend(get_all_tracklist_children(data, &folder.id)?)
      }
      TrackList::Special(special) => {
        all_children.extend(get_all_tracklist_children(data, &special.id)?)
      }
    }
  }
  Ok(all_children)
}

fn get_children_if_user_editable<'a>(
  library: &'a mut Library,
  id: &'a str,
) -> UniResult<&'a mut Vec<String>> {
  let children = match library.trackLists.get_mut(id) {
    Some(TrackList::Folder(folder)) => &mut folder.children,
    Some(TrackList::Special(special)) => match special.name {
      SpecialTrackListName::Root => &mut special.children,
    },
    None => throw!("Attempted to move from/to non-existant folder"),
    _ => throw!("Attempted to move from/to non-folder"),
  };
  Ok(children)
}

#[js_function(3)]
pub fn move_playlist(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let id = arg_to_string(&ctx, 0)?;
  let from_id = arg_to_string(&ctx, 1)?;
  let to_id = arg_to_string(&ctx, 2)?;

  match data.library.trackLists.get(&id) {
    Some(TrackList::Special(_)) => throw!("Cannot move special playlist"),
    None => throw!("List not found"),
    _ => {}
  };

  // check that the to_id is valid before we remove it from from_id
  get_children_if_user_editable(&mut data.library, &to_id)?;

  let from_id_children = get_all_tracklist_children(&data, &id)?;
  if from_id_children.contains(&to_id) {
    throw!("Cannot move playlist to a child of itself");
  }

  let children = get_children_if_user_editable(&mut data.library, &from_id)?;
  let i = match children.iter().position(|child_id| child_id == &id) {
    None => throw!("Could not find playlist"),
    Some(i) => i,
  };
  children.remove(i);

  let to_folder_children = get_children_if_user_editable(&mut data.library, &to_id)?;
  to_folder_children.push(id.clone());

  return ctx.env.get_undefined();
}
