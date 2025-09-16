use crate::data::Data;
use crate::library::Paths;
use anyhow::Result;
use napi::Env;
use rfd::MessageDialog;

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

		// file:line:column
		let location = if let Some(loc) = info.location() {
			format!("{}:{}:{}", loc.file(), loc.line(), loc.column())
		} else {
			"Unknown location".to_string()
		};

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

#[napi(js_name = "get_paths")]
#[allow(dead_code)]
pub fn get_paths(env: Env) -> Paths {
	let data: &Data = get_data(&env);
	data.paths.clone()
}

#[napi(js_name = "save")]
#[allow(dead_code)]
pub fn save(env: Env) -> Result<()> {
	let data: &mut Data = get_data(&env);
	data.save()?;
	Ok(())
}
