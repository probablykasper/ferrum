use crate::data::Data;
use napi::{Env, JsUndefined, Result};

pub fn get_data(env: &Env) -> Result<&mut Data> {
  let data = env.get_instance_data::<Data>()?.ok_or(nerr!("No data"))?;
  return Ok(data);
}

#[napi(js_name = "load_data")]
#[allow(dead_code)]
pub fn load_data(is_dev: bool, env: Env) -> Result<()> {
  let data = Data::load(is_dev)?;
  env.set_instance_data(data, 0, |_ctx| {})?;
  return Ok(());
}

#[napi(object)]
pub struct PathsJs {
  pub library_dir: String,
  pub tracks_dir: String,
  pub library_json: String,
  pub local_data_dir: String,
}

#[napi(js_name = "get_paths")]
#[allow(dead_code)]
pub fn get_paths(env: Env) -> Result<PathsJs> {
  let data: &mut Data = get_data(&env)?;
  Ok(PathsJs {
    library_dir: data.paths.library_dir.to_string_lossy().into(),
    tracks_dir: data.paths.tracks_dir.to_string_lossy().into(),
    library_json: data.paths.library_json.to_string_lossy().into(),
    local_data_dir: data.paths.local_data_dir.to_string_lossy().into(),
  })
}

#[napi(js_name = "save")]
#[allow(dead_code)]
pub fn save(env: Env) -> Result<JsUndefined> {
  let data: &mut Data = get_data(&env)?;
  data.save()?;
  return env.get_undefined();
}
