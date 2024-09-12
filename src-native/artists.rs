use crate::library_types::Library;
use std::collections::HashSet;
use std::time::Instant;

pub fn get_artists(library: &Library) -> HashSet<String> {
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
