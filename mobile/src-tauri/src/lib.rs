use ferrum::library::load_library_from_file;
use ferrum::library_types::Track;

#[tauri::command]
fn load_library(library_json: String) -> Result<Vec<Track>, String> {
	let library = match load_library_from_file(&library_json) {
		Ok(library) => library,
		Err(err) => return Err(err.to_string()),
	};

	let tracks = library.get_tracks().values().cloned().collect();
	Ok(tracks)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_opener::init())
		.invoke_handler(tauri::generate_handler![load_library])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
