use crate::data::Data;
use crate::data_js::get_data;
use crate::get_now_timestamp;
use crate::js::{arg_to_number, arg_to_string, nerr};
use crate::library_types::Track;
use napi::{
  CallContext, Env, JsArrayBuffer, JsObject, JsUndefined, JsUnknown, Result as NResult, Task,
};
use napi_derive::js_function;
use std::path::{Path, PathBuf};

mod import;
mod md;
mod tag;

pub use tag::Tag;

fn id_arg_to_track<'a>(ctx: &'a CallContext, arg: usize) -> NResult<&'a mut Track> {
  let data: &mut Data = get_data(&ctx)?;
  let id = arg_to_string(&ctx, arg)?;
  let tracks = &mut data.library.tracks;
  let track = tracks.get_mut(&id).ok_or(nerr("Track ID not found"))?;
  return Ok(track);
}

#[js_function(1)]
pub fn get_track(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let id = arg_to_string(&ctx, 0)?;
  let tracks = &data.library.tracks;
  let track = tracks.get(&id).ok_or(nerr("Track ID not found"))?;
  let js = ctx.env.to_js_value(&track)?;
  return Ok(js);
}

#[js_function(1)]
pub fn add_play(ctx: CallContext) -> NResult<JsUndefined> {
  let track = id_arg_to_track(&ctx, 0)?;
  let timestamp = get_now_timestamp();
  match &mut track.plays {
    None => track.plays = Some(vec![timestamp]),
    Some(plays) => plays.push(timestamp),
  }
  match &mut track.playCount {
    None => track.playCount = Some(1),
    Some(play_count) => *play_count += 1,
  }
  return ctx.env.get_undefined();
}

#[js_function(1)]
pub fn add_skip(ctx: CallContext) -> NResult<JsUndefined> {
  let track = id_arg_to_track(&ctx, 0)?;
  let timestamp = get_now_timestamp();
  match &mut track.skips {
    None => track.skips = Some(vec![timestamp]),
    Some(skips) => skips.push(timestamp),
  }
  match &mut track.skipCount {
    None => track.skipCount = Some(1),
    Some(skip_count) => *skip_count += 1,
  }
  return ctx.env.get_undefined();
}

#[js_function(3)]
pub fn add_play_time(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let tracks = &mut data.library.tracks;
  let id = arg_to_string(&ctx, 0)?;
  tracks.get_mut(&id).ok_or(nerr("Track ID not found"))?;
  let timestamp: i64 = arg_to_number(&ctx, 1)?;
  let duration: i64 = arg_to_number(&ctx, 2)?;
  data.library.playTime.push((id, timestamp, duration));
  return ctx.env.get_undefined();
}

struct ReadCover(PathBuf);
impl Task for ReadCover {
  type Output = Vec<u8>;
  type JsValue = JsArrayBuffer;
  fn compute(&mut self) -> NResult<Self::Output> {
    let path = &self.0;
    let tag = Tag::read_from_path(path)?;
    match tag.get_image(0) {
      Some(image) => Ok(image.data.to_vec()),
      None => {
        let x = nerr!("No image");
        Err(x)
      }
    }
  }
  fn resolve(self, env: Env, output: Self::Output) -> NResult<Self::JsValue> {
    let result = env.create_arraybuffer_with_data(output)?;
    return Ok(result.into_raw());
  }
}
#[js_function(1)]
pub fn read_cover_async(ctx: CallContext) -> NResult<JsObject> {
  let data: &mut Data = get_data(&ctx)?;
  let track = id_arg_to_track(&ctx, 0)?;
  let tracks_dir = &data.paths.tracks_dir;
  let file_path = tracks_dir.join(&track.file);
  let task = ReadCover(file_path);
  ctx.env.spawn(task).map(|t| t.promise_object())
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

#[js_function(1)]
pub fn import(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let track_path_str = arg_to_string(&ctx, 0)?;
  let path = Path::new(&track_path_str);
  let ext = path.extension().unwrap_or_default().to_string_lossy();
  let track = match ext.as_ref() {
    "mp3" => import::import_mp3(&data, &path)?,
    "m4a" => import::import_m4a(&data, &path)?,
    _ => panic!("Unsupported file extension: {}", ext),
  };
  let id = data.library.generate_id();
  data.library.tracks.insert(id, track);
  return ctx.env.get_undefined();
}

#[js_function(1)]
pub fn load_tags(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  data.current_tag = None;
  let track = id_arg_to_track(&ctx, 0)?;

  let path = data.paths.tracks_dir.join(&track.file);
  let tag = Tag::read_from_path(&path)?;
  data.current_tag = Some(tag);
  ctx.env.get_undefined()
}

pub fn image_to_js_obj(ctx: &CallContext, img: tag::Image) -> NResult<JsObject> {
  let mut image_obj = ctx.env.create_object()?;

  let index = ctx.env.create_uint32(img.index as u32)?;
  image_obj.set_named_property("index", index)?;

  let total_images = ctx.env.create_uint32(img.total_images as u32)?;
  image_obj.set_named_property("total_images", total_images)?;

  let mime_type = ctx.env.create_string(&img.mime_type)?;
  image_obj.set_named_property("mime_type", mime_type)?;

  let encoded_data = base64::encode(img.data);
  let data_str = ctx.env.create_string(&encoded_data)?;
  image_obj.set_named_property("data", data_str)?;

  Ok(image_obj)
}

#[js_function(1)]
pub fn get_image(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let index: u32 = arg_to_number(&ctx, 0)?;

  let tag = match &data.current_tag {
    Some(tag) => tag,
    None => return Ok(ctx.env.get_null()?.into_unknown()),
  };
  let image = match tag.get_image(index as usize) {
    Some(image) => image,
    None => return Ok(ctx.env.get_null()?.into_unknown()),
  };

  let image_obj = image_to_js_obj(&ctx, image)?;
  Ok(image_obj.into_unknown())
}

#[js_function(2)]
pub fn set_image(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let index: u32 = arg_to_number(&ctx, 0)?;
  let path_str = arg_to_string(&ctx, 1)?;
  let path = data.paths.tracks_dir.join(path_str);
  match &mut data.current_tag {
    Some(tag) => tag.set_image(index as usize, path)?,
    None => throw!("No tag loaded"),
  };
  ctx.env.get_undefined()
}

#[js_function(1)]
pub fn remove_image(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let index: u32 = arg_to_number(&ctx, 0)?;
  match data.current_tag {
    Some(ref mut tag) => tag.remove_image(index as usize),
    None => {}
  };
  ctx.env.get_undefined()
}

#[js_function(2)]
pub fn update_track_info(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let track = id_arg_to_track(&ctx, 0)?;
  let new_info: md::TrackMD = serde_json::from_str(&arg_to_string(&ctx, 1)?)?;

  let tag = match &mut data.current_tag {
    Some(tag) => tag,
    None => throw!("No tag loaded"),
  };
  md::update_track_info(&data.paths.tracks_dir, track, tag, new_info)?;

  ctx.env.get_undefined()
}
