use crate::data::{Data, app_log_dir, path_to_string};
use crate::library::Paths;
use anyhow::Result;
use napi::Env;
use std::fs;

pub fn get_data(env: &Env) -> &mut Data {
	let data = env
		.get_instance_data::<Data>()
		.expect("Error getting data")
		.expect("No data");
	return data;
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
		let log_msg = format!("{}", info);
		eprintln!("{}", log_msg);

		let logs_dir = app_log_dir().unwrap();
		fs::create_dir_all(&logs_dir).unwrap();

		let filename = format!(
			"Crash {}.log",
			chrono::Local::now().format("%Y-%m-%d %H-%M-%S")
		);
		let file_path = logs_dir.join(filename);

		fs::write(&file_path, log_msg).expect("Could not save crash log");
		println!("Crash message written to {}", file_path.to_string_lossy());
	}));
	let data = Data::load(is_dev, local_data_path, library_path)?;
	env.set_instance_data(data, 0, |_ctx| {})?;
	return Ok(());
}

#[napi(js_name = "get_paths")]
#[allow(dead_code)]
pub fn get_paths(env: Env) -> Paths {
	let data: &Data = get_data(&env);
	data.paths.clone()
}
#[napi(js_name = "get_logs_dir")]
#[allow(dead_code)]
pub fn get_logs_dir() -> Result<String> {
	match app_log_dir() {
		Ok(path) => Ok(path_to_string(path)),
		Err(err) => Err(err),
	}
}

#[napi(js_name = "save")]
#[allow(dead_code)]
pub fn save(env: Env) -> Result<()> {
	let data: &mut Data = get_data(&env);
	data.save()?;
	Ok(())
}
