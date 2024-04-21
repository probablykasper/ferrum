use lofty::file::TaggedFileExt;
use lofty::picture::Picture;
use lofty::probe::Probe;
use lofty::tag::{TagExt, TagType};
use std::fs::{self, File};
use std::io::{BufReader, Cursor};

fn main() {
  let song_path = "examples/song.opus";
  let bugged_song_path = "examples/bugged.opus";
  let image_path = "examples/3000.jpg";

  fs::copy(song_path, bugged_song_path).unwrap();

  // Open
  let probe = probe_open(bugged_song_path);
  let mut tagged_file = probe.read().unwrap();
  let tag = tagged_file.tag_mut(TagType::VorbisComments).unwrap();

  // Add picture and save
  tag.set_picture(0, get_picture(image_path));
  tag
    .save_to_path(bugged_song_path, lofty::config::WriteOptions::default())
    .unwrap();

  // Open again
  let probe = probe_open(bugged_song_path);
  if let Err(e) = probe.read() {
    eprintln!("ERROR: {:#?}", e.kind());
  }
}

fn probe_open(path: &str) -> Probe<BufReader<File>> {
  let parse_options = lofty::config::ParseOptions::new()
    .read_properties(false)
    .parsing_mode(lofty::config::ParsingMode::Strict);
  let probe = lofty::probe::Probe::open(path)
    .unwrap()
    .options(parse_options.clone());
  probe
}

fn get_picture(image_path: &str) -> Picture {
  let new_bytes = fs::read(image_path).unwrap();
  let mut reader = Cursor::new(new_bytes);
  let picture = lofty::picture::Picture::from_reader(&mut reader).unwrap();
  picture
}
