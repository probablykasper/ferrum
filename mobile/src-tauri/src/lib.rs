use ferrum::library::load_library_from_file;
use ferrum::library_types::Track;
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

#[tauri::command]
#[specta::specta]
fn error_popup(app_handle: tauri::AppHandle, msg: String) {
	eprintln!("Error: {}", msg);

	app_handle
		.dialog()
		.message(&msg)
		.kind(MessageDialogKind::Error)
		.title("Error")
		.show(|_| {});
}

#[tauri::command]
#[specta::specta]
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
	#[cfg(target_os = "android")]
	android_logger::init_once(
		android_logger::Config::default()
			.with_max_level(log::LevelFilter::Trace)
			.with_tag("{{app.name}}"),
	);

	println!("-------------------- RUN");
	let specta_builder = tauri_specta::Builder::<tauri::Wry>::new()
		.commands(tauri_specta::collect_commands![error_popup, load_library]);
	println!("-------------------- run");

	#[cfg(all(debug_assertions, not(target_os = "android")))]
	#[cfg(debug_assertions)]
	specta_builder
		.export(
			specta_typescript::Typescript::default()
				.bigint(specta_typescript::BigIntExportBehavior::String),
			"../bindings.ts",
		)
		.expect("Failed to export typescript bindings");

	tauri::Builder::default()
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_opener::init())
		.invoke_handler(specta_builder.invoke_handler())
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
