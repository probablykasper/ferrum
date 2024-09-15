use crate::data::Data;
use crate::data_js::get_data;
use crate::library_types::Library;
use napi::{Env, Result};
use std::collections::HashSet;
use std::time::Instant;

pub fn load_artists(library: &Library) -> HashSet<String> {
	let now = Instant::now();
	let mut artists = HashSet::new();
	for (_, track) in &library.tracks {
		if !artists.contains(&track.artist) {
			artists.insert(track.artist.clone());
		}
	}
	println!("Get artists: {}ms", now.elapsed().as_millis());
	return artists;
}

#[napi(js_name = "get_artists")]
#[allow(dead_code)]
pub fn get_artists(env: Env) -> Result<Vec<String>> {
	let data: &mut Data = get_data(&env)?;
	let mut artists: Vec<String> = data.artists.clone().into_iter().collect();
	artists.sort();
	Ok(artists)
}
