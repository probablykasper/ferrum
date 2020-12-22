pub fn get_path() -> Result<String, String> {
  let music_dir_buf = match dirs::audio_dir() {
    Some(pathbuf) => pathbuf,
    None => return Err("No music folder found".to_string())
  };
  let file_path = music_dir_buf.join("library.json");
  let file = file_path.to_str().ok_or("Error converting pathbuf to str")?;

  Ok(file.to_owned())
}
