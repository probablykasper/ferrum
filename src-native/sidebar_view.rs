use crate::data::Data;
use crate::data_js::get_data;
use crate::library::Paths;
use crate::{path_to_json, UniResult};
use atomicwrites::AtomicFile;
use atomicwrites::OverwriteBehavior::AllowOverwrite;
use napi::{Env, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::io::Write;

#[derive(Serialize, Deserialize)]
pub struct SidebarView {
  pub shown_playlist_folders: HashSet<String>,
}
impl SidebarView {
  pub fn load(paths: &Paths) -> SidebarView {
    match path_to_json(paths.local_data_dir.join("view.json")) {
      Ok(view_cache) => view_cache,
      Err(_) => SidebarView {
        shown_playlist_folders: HashSet::new(),
      },
    }
  }
  pub fn save(&self, paths: &Paths) -> UniResult<()> {
    let json_str = match serde_json::to_string(self) {
      Ok(json_str) => json_str,
      Err(_) => throw!("Error saving view_cache"),
    };
    let file_path = paths.local_data_dir.join("view.json");
    let af = AtomicFile::new(file_path, AllowOverwrite);
    let result = af.write(|f| f.write_all(json_str.as_bytes()));
    match result {
      Ok(_) => {}
      Err(_) => throw!("Error writing view_cache"),
    };
    Ok(())
  }
}
#[napi(js_name = "shown_playlist_folders")]
#[allow(dead_code)]
pub fn shown_playlist_folders(env: Env) -> Result<Vec<String>> {
  let data: &Data = get_data(&env)?;
  let shown_folders = &data.view_cache.shown_playlist_folders;
  Ok(shown_folders.iter().cloned().collect())
}
#[napi(js_name = "view_folder_set_show")]
#[allow(dead_code)]
pub fn view_folder_set_show(id: String, show: bool, env: Env) -> Result<()> {
  let data: &mut Data = get_data(&env)?;
  if show {
    data.view_cache.shown_playlist_folders.insert(id);
  } else {
    data.view_cache.shown_playlist_folders.remove(&id);
  }
  let _ = data.view_cache.save(&data.paths);
  Ok(())
}
