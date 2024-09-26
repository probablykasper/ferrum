use crate::data::Data;
use crate::data_js::get_data;
use crate::library::Paths;
use crate::path_to_json;
use anyhow::{Context, Result};
use atomicwrites::AtomicFile;
use atomicwrites::OverwriteBehavior::AllowOverwrite;
use napi::Env;
use serde::{Deserialize, Serialize};
use std::io::Write;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[napi(object)]
pub struct ViewOptions {
	pub shown_playlist_folders: Vec<String>,
	/// Empty is treated as default
	pub columns: Vec<String>,
}
impl ViewOptions {
	pub fn load(paths: &Paths) -> ViewOptions {
		match path_to_json(paths.local_data_dir.join("view.json")) {
			Ok(view_cache) => view_cache,
			Err(_) => ViewOptions {
				shown_playlist_folders: Vec::new(),
				columns: Vec::new(),
			},
		}
	}
	pub fn save(&self, paths: &Paths) -> Result<()> {
		let json_str = serde_json::to_string(self).context("Error saving view.json")?;
		let file_path = paths.local_data_dir.join("view.json");
		let af = AtomicFile::new(file_path, AllowOverwrite);
		af.write(|f| f.write_all(json_str.as_bytes()))
			.context("Error writing view.json")?;
		Ok(())
	}
}

#[napi(js_name = "load_view_options")]
#[allow(dead_code)]
pub fn load_view_options(env: Env) -> Result<ViewOptions> {
	let data: &Data = get_data(&env)?;
	Ok(ViewOptions::load(&data.paths))
}
#[napi(js_name = "save_view_options")]
#[allow(dead_code)]
pub fn save_view_options(view_options: ViewOptions, env: Env) -> Result<()> {
	let data: &mut Data = get_data(&env)?;
	view_options.save(&data.paths)?;
	Ok(())
}
