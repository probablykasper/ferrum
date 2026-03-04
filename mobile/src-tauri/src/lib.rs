use anyhow::bail;
use ferrum::library_types::VersionedLibrary;
use ferrum::library_types::{Library, Track};
use std::time::Instant;
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

fn load_library_from_file(library_json: &str) -> anyhow::Result<Library> {
	let now = Instant::now();

	let mut json_bytes = library_json.as_bytes().to_vec();

	let versioned_library: VersionedLibrary = match simd_json::from_slice(&mut json_bytes) {
		Ok(lib) => {
			println!("Parsed library: {}ms", now.elapsed().as_millis());
			lib
		}
		Err(err) => {
			bail!("Error parsing library: {}", err);
		}
	};
	let now = Instant::now();

	let library = versioned_library.upgrade().init_libary();
	println!("Initialized library: {}ms", now.elapsed().as_millis());
	Ok(library)
}

#[tauri::command]
#[specta::specta]
fn load_library(library_json: String) -> Result<Vec<Track>, String> {
	println!("Loadeding... -------------- {library_json}");
	let library = match load_library_from_file(&library_json) {
		Ok(library) => library,
		Err(err) => return Err(err.to_string()),
	};

	let tracks: Vec<_> = library.get_tracks().values().cloned().collect();
	println!("Loaded {} tracks", tracks.len());
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

	let specta_builder = tauri_specta::Builder::<tauri::Wry>::new()
		.commands(tauri_specta::collect_commands![error_popup, load_library]);

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
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_opener::init())
		.invoke_handler(specta_builder.invoke_handler())
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
