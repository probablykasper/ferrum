use crate::data::Data;
use crate::data_js::get_data;
use crate::js::{arg_to_bool, arg_to_string};
use crate::library::Paths;
use crate::{path_to_json, UniResult};
use atomicwrites::AtomicFile;
use atomicwrites::OverwriteBehavior::AllowOverwrite;
use napi::JsUndefined;
use napi::{CallContext, JsUnknown, Result as NResult};
use napi_derive::js_function;
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
#[js_function(0)]
pub fn shown_playlist_folders(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &Data = get_data(&ctx)?;
  let view_cache = &data.view_cache;
  ctx.env.to_js_value(&view_cache.shown_playlist_folders)
}
#[js_function(2)]
pub fn view_folder_set_show(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let id: String = arg_to_string(&ctx, 0)?;
  let show: bool = arg_to_bool(&ctx, 1)?;
  if show {
    data.view_cache.shown_playlist_folders.insert(id);
  } else {
    data.view_cache.shown_playlist_folders.remove(&id);
  }
  let _ = data.view_cache.save(&data.paths);
  ctx.env.get_undefined()
}
