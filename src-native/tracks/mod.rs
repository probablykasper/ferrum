use crate::data::Data;
use crate::data_js::get_data;
use crate::get_now_timestamp;
use crate::js::nerr;
use crate::library_types::{MsSinceUnixEpoch, Track, TrackID};
use napi::{Env, JsArrayBuffer, JsBuffer, JsObject, Result, Task};
use std::fs;
use std::path::{Path, PathBuf};

pub mod import;
mod md;
mod tag;

pub use tag::Tag;

fn id_to_track<'a>(env: &'a Env, id: &String) -> Result<&'a mut Track> {
  let data: &mut Data = get_data(&env)?;
  let tracks = &mut data.library.tracks;
  let track = tracks.get_mut(id).ok_or(nerr("Track ID not found"))?;
  return Ok(track);
}

#[napi(js_name = "get_track")]
#[allow(dead_code)]
pub fn get_track(id: String, env: Env) -> Result<Track> {
  let data: &mut Data = get_data(&env)?;
  let tracks = &data.library.tracks;
  let track = tracks.get(&id).ok_or(nerr("Track ID not found"))?;
  Ok(track.clone())
}

#[napi(js_name = "track_exists")]
#[allow(dead_code)]
pub fn track_exists(id: String, env: Env) -> Result<bool> {
  let data: &mut Data = get_data(&env)?;
  let tracks = &data.library.tracks;
  Ok(tracks.contains_key(&id))
}

#[napi(js_name = "add_play")]
#[allow(dead_code)]
pub fn add_play(track_id: String, env: Env) -> Result<()> {
  let track = id_to_track(&env, &track_id)?;
  let timestamp = get_now_timestamp();
  match &mut track.plays {
    None => track.plays = Some(vec![timestamp]),
    Some(plays) => plays.push(timestamp),
  }
  match &mut track.playCount {
    None => track.playCount = Some(1),
    Some(play_count) => *play_count += 1,
  }
  Ok(())
}

#[napi(js_name = "add_skip")]
#[allow(dead_code)]
pub fn add_skip(track_id: String, env: Env) -> Result<()> {
  let track = id_to_track(&env, &track_id)?;
  let timestamp = get_now_timestamp();
  match &mut track.skips {
    None => track.skips = Some(vec![timestamp]),
    Some(skips) => skips.push(timestamp),
  }
  match &mut track.skipCount {
    None => track.skipCount = Some(1),
    Some(skip_count) => *skip_count += 1,
  }
  Ok(())
}

#[napi(js_name = "add_play_time")]
#[allow(dead_code)]
pub fn add_play_time(id: TrackID, start: MsSinceUnixEpoch, dur_ms: i64, env: Env) -> Result<()> {
  let data: &mut Data = get_data(&env)?;
  let tracks = &mut data.library.tracks;
  tracks.get_mut(&id).ok_or(nerr("Track ID not found"))?;
  data.library.playTime.push((id, start, dur_ms));
  Ok(())
}

/// File path, artwork index
struct ReadCover(PathBuf, usize);
impl Task for ReadCover {
  type Output = Vec<u8>;
  type JsValue = JsBuffer;
  fn compute(&mut self) -> Result<Self::Output> {
    let path = &self.0;
    let index = self.1;

    let tag = Tag::read_from_path(path)?;
    let image = match tag.get_image_consume(index) {
      Some(image) => image,
      None => {
        return Err(nerr!("No image"));
      }
    };

    Ok(image.data)
  }
  fn resolve(&mut self, env: Env, output: Self::Output) -> Result<Self::JsValue> {
    let result = env.create_buffer_copy(output)?;
    return Ok(result.into_raw());
  }
}
#[napi(js_name = "read_cover_async", ts_return_type = "Promise<ArrayBuffer>")]
#[allow(dead_code)]
pub fn read_cover_async(track_id: String, index: u16, env: Env) -> Result<JsObject> {
  let data: &mut Data = get_data(&env)?;
  let track = id_to_track(&env, &track_id)?;
  let tracks_dir = &data.paths.tracks_dir;
  let file_path = tracks_dir.join(&track.file);
  let task = ReadCover(file_path.into(), index.into());
  env.spawn(task).map(|t| t.promise_object())
}

fn sanitize_filename(input: &String) -> String {
  let mut string = input.replace("/", "_");
  string = string.replace("?", "_");
  string = string.replace("<", "_");
  string = string.replace(">", "_");
  string = string.replace("\\", "_");
  string = string.replace(":", "_");
  string = string.replace("*", "_");
  string = string.replace("\"", "_");
  // prevent control characters:
  string = string.replace("0x", "__");
  // Filenames can be max 255 bytes. We use 230 to give
  // margin for the fileNum and file extension.
  string.truncate(230);
  return string;
}

pub fn generate_filename(dest_dir: &Path, artist: &str, title: &str, ext: &str) -> String {
  let beginning = artist.to_owned() + " - " + title;
  let beginning = sanitize_filename(&beginning);

  let mut file_num: u32 = 1;
  let mut filename = beginning.clone() + "." + ext;
  for i in 0..9999 {
    if i == 1000 {
      panic!("Already got 500 files with that artist and title")
    }
    let full_path = dest_dir.join(&filename);
    if full_path.exists() {
      file_num += 1;
      filename = beginning.clone() + " " + file_num.to_string().as_str() + "." + ext;
    } else {
      break;
    }
  }
  return filename;
}

#[napi(js_name = "import_file")]
#[allow(dead_code)]
pub fn import_file(path: String, now: MsSinceUnixEpoch, env: Env) -> Result<()> {
  let data: &mut Data = get_data(&env)?;
  let id = data.library.generate_id();
  let track = import::import_auto(&data, Path::new(&path), now)?;
  data.library.tracks.insert(id, track);
  Ok(())
}

#[napi(js_name = "load_tags")]
#[allow(dead_code)]
pub fn load_tags(track_id: String, env: Env) -> Result<()> {
  let data: &mut Data = get_data(&env)?;
  data.current_tag = None;
  let track = id_to_track(&env, &track_id)?;

  let path = data.paths.tracks_dir.join(&track.file);
  let tag = Tag::read_from_path(&path)?;
  data.current_tag = Some(tag);
  Ok(())
}

#[napi(object)]
pub struct JsImage {
  pub index: i64,
  pub total_images: i64,
  pub mime_type: String,
  pub data: JsBuffer,
}

#[napi(js_name = "get_image")]
#[allow(dead_code)]
pub fn get_image(index: u32, env: Env) -> Result<Option<JsImage>> {
  let data: &Data = get_data(&env)?;

  let tag = match &data.current_tag {
    Some(tag) => tag,
    None => return Ok(None),
  };
  let img = match tag.get_image_ref(index as usize) {
    Some(image) => image,
    None => return Ok(None),
  };

  let js_image = JsImage {
    index: img.index,
    total_images: img.total_images,
    mime_type: img.mime_type,
    data: env.create_buffer_copy(img.data)?.into_raw(),
  };
  Ok(Some(js_image))
}

#[napi(js_name = "set_image")]
#[allow(dead_code)]
pub fn set_image(index: u32, path_str: String, env: Env) -> Result<()> {
  let data: &mut Data = get_data(&env)?;
  let path = data.paths.tracks_dir.join(path_str);
  match &mut data.current_tag {
    Some(tag) => {
      let ext = path.extension().unwrap_or_default().to_string_lossy();
      let mime_type = match ext.as_ref() {
        "jpg" | "jpeg" => "image/jpeg".to_string(),
        "png" => "image/png".to_string(),
        "bmp" => "image/bmp".to_string(),
        ext => throw!("Unsupported file type: {}", ext),
      };
      let new_bytes = match fs::read(&path) {
        Ok(b) => b,
        Err(e) => throw!("Error reading that file: {}", e),
      };
      tag.set_image(index as usize, new_bytes, &mime_type)?;
    }
    None => throw!("No tag loaded"),
  };
  Ok(())
}

#[napi(js_name = "set_image_data")]
#[allow(dead_code)]
pub fn set_image_data(index: u32, bytes: JsArrayBuffer, mime_type: String, env: Env) -> Result<()> {
  let bytes: Vec<u8> = bytes.into_value()?.to_vec();
  let data: &mut Data = get_data(&env)?;
  match &mut data.current_tag {
    Some(tag) => tag.set_image(index as usize, bytes, &mime_type)?,
    None => throw!("No tag loaded"),
  };
  Ok(())
}

#[napi(js_name = "remove_image")]
#[allow(dead_code)]
pub fn remove_image(index: u32, env: Env) -> Result<()> {
  let data: &mut Data = get_data(&env)?;
  match data.current_tag {
    Some(ref mut tag) => tag.remove_image(index as usize),
    None => {}
  };
  Ok(())
}

#[napi(js_name = "update_track_info")]
#[allow(dead_code)]
pub fn update_track_info(track_id: String, info: md::TrackMD, env: Env) -> Result<()> {
  let data: &mut Data = get_data(&env)?;
  let track = id_to_track(&env, &track_id)?;

  let tag = match &mut data.current_tag {
    Some(tag) => tag,
    None => throw!("No tag loaded"),
  };
  md::update_track_info(&data.paths.tracks_dir, track, tag, info)?;

  Ok(())
}
