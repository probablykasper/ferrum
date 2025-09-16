use anyhow::{Context, Result};
use serde::de::DeserializeOwned;
use std::fs::File;
use std::io::BufReader;
use std::time::{SystemTime, UNIX_EPOCH};

#[macro_use]
extern crate napi_derive;

mod data;
mod data_js;
mod filter;
mod itunes_import;
mod library;
mod library_types;
mod page;
mod playlists;
mod sort;
mod tracks;
mod view_options;

#[napi]
pub enum FerrumStatus {
	Ok,
	FileDeletionError(String),
	SaveError(String),
}
impl FerrumStatus {
	pub fn is_err(&self) -> bool {
		match self {
			FerrumStatus::Ok => false,
			_ => true,
		}
	}
}

fn get_now_timestamp() -> i64 {
	let timestamp = match SystemTime::now().duration_since(UNIX_EPOCH) {
		Ok(n) => n.as_millis() as i64,
		Err(err) => err.duration().as_millis() as i64,
	};
	return timestamp;
}

fn sys_time_to_timestamp(sys_time: &SystemTime) -> i64 {
	let timestamp = match sys_time.duration_since(UNIX_EPOCH) {
		Ok(n) => n.as_millis() as i64,
		Err(err) => err.duration().as_millis() as i64,
	};
	return timestamp;
}

fn str_to_option(s: String) -> Option<String> {
	match s.as_str() {
		"" => None,
		_ => Some(s),
	}
}

fn path_to_json<J>(path: &str) -> Result<J>
where
	J: DeserializeOwned,
{
	let file = File::open(path).context("Error opening file")?;
	let reader = BufReader::new(file);
	let json = serde_json::from_reader(reader).context("Error parsing file")?;
	Ok(json)
}
