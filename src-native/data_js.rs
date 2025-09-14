use crate::data::Data;
use anyhow::{Context, Result};
use napi::{Env, JsUndefined};
use rfd::MessageDialog;

pub fn get_data(env: &Env) -> Result<&mut Data> {
	let data = env.get_instance_data::<Data>()?.context("No data")?;
	return Ok(data);
}

#[napi(js_name = "load_data")]
#[allow(dead_code)]
pub fn load_data(
	is_dev: bool,
	local_data_path: Option<String>,
	library_path: Option<String>,
	env: Env,
) -> Result<()> {
	std::panic::set_hook(Box::new(move |info| {
		let thread = std::thread::current();
		let thread_name = thread.name().unwrap_or("<unnamed>");
		// Get the panic message
		let panic_msg = if let Some(s) = info.payload().downcast_ref::<&str>() {
			*s
		} else if let Some(s) = info.payload().downcast_ref::<String>() {
			s.as_str()
		} else {
			"Unknown panic message"
		};

		// Get the location of the panic (file, line, column)
		let location = if let Some(loc) = info.location() {
			format!("{}:{}:{}", loc.file(), loc.line(), loc.column())
		} else {
			"Unknown location".to_string()
		};

		// let stacktrace = std::backtrace::Backtrace::force_capture();
		// println!("Got panic. {}\n{}", panic_msg, stacktrace);
		// println!("");
		eprintln!(
			"thread '{}' panicked at '{}': {}",
			thread_name, panic_msg, location
		);

		MessageDialog::new()
			.set_title(&format!("{}", panic_msg))
			.set_description(&format!("{}", location))
			.set_buttons(rfd::MessageButtons::Ok)
			.set_level(rfd::MessageLevel::Error)
			.show();
	}));
	let data = Data::load(is_dev, local_data_path, library_path)?;
	env.set_instance_data(data, 0, |_ctx| {})?;
	return Ok(());
}

#[napi(object)]
pub struct PathsJs {
	pub library_dir: String,
	pub tracks_dir: String,
	pub library_json: String,
	pub cache_db: String,
	pub local_data_dir: String,
	pub path_separator: String,
}

#[napi(js_name = "get_paths")]
#[allow(dead_code)]
pub fn get_paths(env: Env) -> Result<PathsJs> {
	let data: &mut Data = get_data(&env)?;
	Ok(PathsJs {
		library_dir: data.paths.library_dir.to_string_lossy().into(),
		tracks_dir: data.paths.tracks_dir.to_string_lossy().into(),
		library_json: data.paths.library_json.to_string_lossy().into(),
		cache_db: data.paths.cache_db.to_string_lossy().into(),
		local_data_dir: data.paths.local_data_dir.to_string_lossy().into(),
		path_separator: std::path::MAIN_SEPARATOR_STR.into(),
	})
}

#[napi(js_name = "save")]
#[allow(dead_code)]
pub fn save(env: Env) -> napi::Result<JsUndefined> {
	let data: &mut Data = get_data(&env)?;
	data.save()?;
	env.get_undefined()
}
