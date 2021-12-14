use crate::data::Data;
use crate::data_js::get_data;
use crate::js::{arg_to_number, arg_to_string, nerr};
use crate::library_types::Track;
use crate::{get_now_timestamp, str_to_option, sys_time_to_timestamp, UniResult};
use id3;
use mp3_metadata;
use mp4ameta;
use napi::{
  CallContext, Env, JsArrayBuffer, JsObject, JsUndefined, JsUnknown, Result as NResult, Task,
};
use napi_derive::js_function;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

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

enum CoverReadError {
  NoJpegOrPngFound,
  TagReadError(String),
  InvalidFileExtension,
}
fn read_cover(path: &PathBuf) -> Result<Vec<u8>, CoverReadError> {
  if path.to_string_lossy().ends_with(".mp3") {
    let tag = match id3::Tag::read_from_path(&path) {
      Ok(tag) => tag,
      Err(e) => {
        return Err(CoverReadError::TagReadError(e.to_string()));
      }
    };
    for picture in tag.pictures() {
      match picture.mime_type.as_str() {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        _ => continue,
      };
      match picture.picture_type {
        id3::frame::PictureType::Other => {}
        id3::frame::PictureType::Undefined(_) => {}
        id3::frame::PictureType::CoverFront => {}
        _ => continue,
      }
      return Ok(picture.data.clone());
    }
    return Err(CoverReadError::NoJpegOrPngFound);
  } else if path.to_string_lossy().ends_with(".m4a") {
    let tag = match mp4ameta::Tag::read_from_path(&path) {
      Ok(tag) => tag,
      Err(e) => {
        return Err(CoverReadError::TagReadError(e.to_string()));
      }
    };
    match tag.artwork() {
      Some(img) => match img.fmt {
        mp4ameta::ImgFmt::Jpeg => return Ok(img.data.to_vec()),
        mp4ameta::ImgFmt::Png => return Ok(img.data.to_vec()),
        _ => return Err(CoverReadError::NoJpegOrPngFound),
      },
      None => {
        return Err(CoverReadError::NoJpegOrPngFound);
      }
    }
  } else {
    return Err(CoverReadError::InvalidFileExtension);
  }
}

struct ReadCover(PathBuf);
impl Task for ReadCover {
  type Output = Vec<u8>;
  type JsValue = JsArrayBuffer;
  fn compute(&mut self) -> NResult<Self::Output> {
    let path = &self.0;
    return match read_cover(path) {
      Ok(data) => Ok(data),
      Err(CoverReadError::NoJpegOrPngFound) => Err(nerr("Artwork not found")),
      Err(CoverReadError::InvalidFileExtension) => Err(nerr("Invalid File Extension")),
      Err(CoverReadError::TagReadError(string)) => {
        let x = nerr!("Error reading tag: {}", string);
        Err(x)
      }
    };
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

fn generate_filename(dest_dir: &Path, artist: &str, title: &str, ext: &str) -> String {
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
    "mp3" => import_mp3(&data, &path),
    _ => panic!("Unsupported file extension: {}", ext),
  };
  let id = data.library.generate_id();
  data.library.tracks.insert(id, track);
  return ctx.env.get_undefined();
}

fn timestamp_from_year(year: i32) -> id3::Timestamp {
  return id3::Timestamp {
    year,
    month: None,
    day: None,
    hour: None,
    minute: None,
    second: None,
  };
}

fn get_and_fix_year(tag: &mut id3::Tag) -> Option<i64> {
  match tag.date_recorded() {
    Some(tdrc) => Some(i64::from(tdrc.year)),
    None => match tag.year() {
      Some(tyer) => {
        let x = timestamp_from_year(tyer);
        tag.set_date_recorded(x);
        Some(i64::from(tyer))
      }
      None => match tag.date_released() {
        Some(tdrl) => {
          tag.set_date_recorded(timestamp_from_year(tdrl.year));
          Some(i64::from(tdrl.year))
        }
        None => None,
      },
    },
  }
}

fn import_mp3(data: &Data, track_path: &Path) -> Track {
  fn get_frame_text(tag: &id3::Tag, id: &str) -> Option<String> {
    let frame = tag.get(id)?;
    let text = frame.content().text()?;
    return Some(text.to_owned());
  }

  let dest_md = fs::metadata(&track_path).expect("Unable to read file metadata");
  let now = get_now_timestamp();

  let mut date_modified = match dest_md.modified() {
    Ok(sys_time) => sys_time_to_timestamp(&sys_time),
    Err(_) => now,
  };

  let mp3_md = mp3_metadata::read_from_file(&track_path).expect("Error reading mp3 metadata");
  let duration = mp3_md.duration.as_secs_f64();
  let sample_rate = match mp3_md.frames.get(0) {
    Some(frame) => frame.sampling_freq as f64,
    None => panic!("Unable to read first audio frame"),
  };
  let bitrate = {
    let mut bits = 0;
    for frame in mp3_md.frames {
      bits += frame.size;
    }
    bits *= 8; // kbits to kb
    let bitrate = f64::from(bits) / duration;
    bitrate.round()
  };

  let mut tag_changed = false;
  let mut tag = match id3::Tag::read_from_path(&track_path) {
    Ok(tag) => tag,
    Err(_) => id3::Tag::new(),
  };

  let year = get_and_fix_year(&mut tag);

  let title = match tag.title() {
    Some(title) => title.to_owned(),
    None => {
      let file_stem = match track_path.file_stem() {
        Some(stem) => stem.to_string_lossy().into_owned(),
        None => "".to_string(),
      };
      tag.set_title(&file_stem);
      tag_changed = true;
      file_stem
    }
  };
  let artist = tag.artist();

  let tracks_dir = &data.paths.tracks_dir;
  let filename = generate_filename(&tracks_dir, artist.unwrap_or(""), &title, "mp3");
  let dest_path = tracks_dir.join(&filename);

  fs::copy(track_path, &dest_path).expect("Error copying file");

  if tag_changed {
    tag
      .write_to_path(&dest_path, id3::Version::Id3v24)
      .expect("Unable to tag file");
    // manually set date_modified because the date_modified doens't seem to
    // immediately update after tag.write_to_path().
    date_modified = now;
  }

  let track = Track {
    size: dest_md.len() as i64,
    duration: duration,
    bitrate: bitrate,
    sampleRate: sample_rate,
    file: filename,
    dateModified: date_modified,
    dateAdded: now,
    name: title.to_string(),
    importedFrom: None,
    originalId: None,
    artist: artist.unwrap_or_default().to_string(),
    composer: get_frame_text(&tag, "TCOM"),
    sortName: get_frame_text(&tag, "TSOT"),
    sortArtist: get_frame_text(&tag, "TSOP"),
    sortComposer: get_frame_text(&tag, "TSOC"),
    genre: tag.genre().map(|s| s.to_owned()),
    rating: None,
    year: year,
    bpm: match get_frame_text(&tag, "TBPM") {
      Some(n) => n.parse().ok(),
      None => None,
    },
    comments: tag.comments().next().map(|c| c.text.clone()),
    grouping: get_frame_text(&tag, "GRP1"),
    liked: None,
    disliked: None,
    disabled: None,
    compilation: None,
    albumName: tag.album().map(|s| s.to_owned()),
    albumArtist: tag.album_artist().map(|s| s.to_owned()),
    sortAlbumName: get_frame_text(&tag, "TSOA"),
    sortAlbumArtist: get_frame_text(&tag, "TSO2"),
    trackNum: tag.track(),
    trackCount: tag.total_tracks(),
    discNum: tag.disc(),
    discCount: tag.total_discs(),
    dateImported: None,
    playCount: None,
    plays: None,
    playsImported: None,
    skipCount: None,
    skips: None,
    skipsImported: None,
    volume: None,
  };
  return track;
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Debug)]
struct TrackMD {
  name: String,
  artist: String,
  albumName: String,
  albumArtist: String,
  composer: String,
  grouping: String,
  genre: String,
  year: String,
  trackNum: String,
  trackCount: String,
  discNum: String,
  discCount: String,
  comments: String,
}

pub enum SetInfoError {
  NumberRequired,
  Other(String),
}
impl From<SetInfoError> for napi::Error {
  fn from(err: SetInfoError) -> napi::Error {
    match err {
      SetInfoError::NumberRequired => napi::Error::from_reason("Number required".to_string()),
      SetInfoError::Other(s) => napi::Error::from_reason(s),
    }
  }
}

pub enum Tag {
  Id3(id3::Tag),
  Mp4(mp4ameta::Tag),
}
impl Tag {
  pub fn write_to_path(&mut self, path: &Path) {
    match self {
      Tag::Id3(tag) => {
        match tag.write_to_path(path, id3::Version::Id3v24) {
          Ok(_) => {}
          Err(e) => panic!("Unable to tag file: {}", e.description),
        };
      }
      Tag::Mp4(tag) => {
        match tag.write_to_path(path) {
          Ok(_) => (),
          Err(e) => panic!("Unable to tag file: {}", e.description),
        };
      }
    }
  }
  pub fn remove_title(&mut self) {
    match self {
      Tag::Id3(tag) => tag.remove_title(),
      Tag::Mp4(tag) => tag.remove_title(),
    }
  }
  pub fn set_title(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_title(value),
      Tag::Mp4(tag) => tag.set_title(value),
    }
  }
  pub fn remove_artists(&mut self) {
    match self {
      Tag::Id3(tag) => tag.remove_artist(),
      Tag::Mp4(tag) => tag.remove_artists(),
    }
  }
  pub fn set_artist(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_artist(value),
      Tag::Mp4(tag) => tag.set_artist(value),
    }
  }
  pub fn remove_album(&mut self) {
    match self {
      Tag::Id3(tag) => tag.remove_album(),
      Tag::Mp4(tag) => tag.remove_album(),
    }
  }
  pub fn set_album(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_album(value),
      Tag::Mp4(tag) => tag.set_album(value),
    }
  }
  pub fn remove_album_artists(&mut self) {
    match self {
      Tag::Id3(tag) => tag.remove_album_artist(),
      Tag::Mp4(tag) => tag.remove_album_artists(),
    }
  }
  pub fn set_album_artist(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_album_artist(value),
      Tag::Mp4(tag) => tag.set_album_artist(value),
    }
  }
  pub fn remove_composers(&mut self) {
    match self {
      Tag::Id3(tag) => tag.remove("TCOM"),
      Tag::Mp4(tag) => tag.remove_composers(),
    }
  }
  pub fn set_composer(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_text("TCOM", value),
      Tag::Mp4(tag) => tag.set_composer(value),
    }
  }
  pub fn remove_groupings(&mut self) {
    match self {
      Tag::Id3(tag) => tag.remove("GRP1"),
      Tag::Mp4(tag) => tag.remove_groupings(),
    }
  }
  pub fn set_grouping(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_text("GRP1", value),
      Tag::Mp4(tag) => tag.set_grouping(value),
    }
  }
  pub fn remove_genres(&mut self) {
    match self {
      Tag::Id3(tag) => tag.remove_genre(),
      Tag::Mp4(tag) => tag.remove_genres(),
    }
  }
  pub fn set_genre(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_genre(value),
      Tag::Mp4(tag) => tag.set_genre(value),
    }
  }
  pub fn remove_year(&mut self) {
    match self {
      Tag::Id3(tag) => {
        tag.remove_year();
        tag.remove_date_recorded();
      }
      Tag::Mp4(tag) => tag.remove_year(),
    }
  }
  pub fn set_year(&mut self, value: i32) {
    match self {
      Tag::Id3(tag) => {
        tag.set_year(value);
        tag.set_date_recorded(timestamp_from_year(value));
      }
      Tag::Mp4(tag) => tag.set_year(value.to_string()),
    }
  }
  /// For some tag types, `total` cannot exist without `number`. In those
  /// cases, `total` is assumed to be `None`.
  pub fn set_track_info(
    &mut self,
    number: Option<u32>,
    total: Option<u32>,
  ) -> Result<(), SetInfoError> {
    match self {
      Tag::Id3(tag) => match (number, total) {
        (Some(number), Some(total)) => {
          tag.set_track(number);
          tag.set_total_tracks(total);
        }
        (Some(number), None) => {
          tag.remove_total_tracks();
          tag.set_track(number);
        }
        (None, Some(_)) => {
          return Err(SetInfoError::NumberRequired);
        }
        (None, None) => {
          tag.remove_total_tracks();
          tag.remove_track();
        }
      },
      Tag::Mp4(tag) => {
        if number.unwrap_or(0) > u16::MAX as u32 {
          let msg = "Track number too large for this file".to_string();
          return Err(SetInfoError::Other(msg));
        }
        if total.unwrap_or(0) > u16::MAX as u32 {
          let msg = "Total tracks too large for this file".to_string();
          return Err(SetInfoError::Other(msg));
        }
        match number {
          Some(number) => tag.set_track_number(number as u16),
          None => tag.remove_track_number(),
        }
        match total {
          Some(total) => tag.set_total_tracks(total as u16),
          None => tag.remove_total_tracks(),
        }
      }
    }
    Ok(())
  }
  /// For some tag types, `total` cannot exist without `number`. In those
  /// cases, `total` is assumed to be `None`.
  pub fn set_disc_info(
    &mut self,
    number: Option<u32>,
    total: Option<u32>,
  ) -> Result<(), SetInfoError> {
    match self {
      Tag::Id3(tag) => match (number, total) {
        (Some(number), Some(total)) => {
          tag.set_disc(number);
          tag.set_total_discs(total);
        }
        (Some(number), None) => {
          tag.remove_total_discs();
          tag.set_disc(number);
        }
        (None, Some(_)) => {
          return Err(SetInfoError::NumberRequired);
        }
        (None, None) => {
          tag.remove_total_discs();
          tag.remove_disc();
        }
      },
      Tag::Mp4(tag) => {
        if number.unwrap_or(0) > u16::MAX as u32 {
          let msg = "Disc number too large for this file".to_string();
          return Err(SetInfoError::Other(msg));
        }
        if total.unwrap_or(0) > u16::MAX as u32 {
          let msg = "Total discs too large for this file".to_string();
          return Err(SetInfoError::Other(msg));
        }
        match number {
          Some(number) => tag.set_disc_number(number as u16),
          None => tag.remove_disc_number(),
        }
        match total {
          Some(total) => tag.set_total_discs(total as u16),
          None => tag.remove_total_discs(),
        }
      }
    }
    Ok(())
  }
  pub fn remove_comments(&mut self) {
    match self {
      Tag::Id3(tag) => tag.remove("COMM"),
      Tag::Mp4(tag) => tag.remove_comments(),
    }
  }
  pub fn set_comment(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => {
        tag.remove("COMM");
        tag.add_comment(id3::frame::Comment {
          lang: "eng".to_string(),
          description: "".to_string(),
          text: value.to_string(),
        });
      }
      Tag::Mp4(tag) => tag.set_comment(value),
    }
  }
  pub fn set_image(&mut self, index: usize, path: PathBuf) -> UniResult<()> {
    let new_bytes = match fs::read(&path) {
      Ok(b) => b,
      Err(e) => throw!("Error reading that file: {}", e),
    };
    let ext = path.extension().unwrap_or_default().to_string_lossy();
    match self {
      Tag::Id3(tag) => {
        let mut pic_frames: Vec<_> = tag
          .frames()
          .filter(|frame| frame.content().picture().is_some())
          .map(|frame| frame.clone())
          .collect();
        let mime_type = match ext.as_ref() {
          "jpg" | "jpeg" => "image/jpeg".to_string(),
          "png" => "image/png".to_string(),
          ext => throw!("Unsupported file type: {}", ext),
        };
        let mut new_pic = id3::frame::Picture {
          mime_type,
          picture_type: id3::frame::PictureType::Other,
          description: "".to_string(),
          data: new_bytes,
        };
        match pic_frames.get_mut(index) {
          Some(old_frame) => {
            let old_pic = old_frame.content().picture().unwrap();
            new_pic.picture_type = old_pic.picture_type;
            new_pic.description = old_pic.description.clone();
            let new_frame = id3::Frame::with_content("APIC", id3::Content::Picture(new_pic));
            *old_frame = new_frame;
          }
          None => {
            if index == pic_frames.len() {
              let new_frame = id3::Frame::with_content("APIC", id3::Content::Picture(new_pic));
              pic_frames.insert(index, new_frame);
            } else {
              throw!("Index out of range");
            }
          }
        }
        tag.remove_all_pictures();
        for pic_frame in pic_frames {
          tag.add_frame(pic_frame);
        }
      }
      Tag::Mp4(tag) => {
        let mut artworks: Vec<_> = tag.take_artworks().collect();
        let new_artwork = mp4ameta::Img {
          fmt: match ext.as_ref() {
            "jpg" | "jpeg" => mp4ameta::ImgFmt::Jpeg,
            "png" => mp4ameta::ImgFmt::Png,
            "bmp" => mp4ameta::ImgFmt::Bmp,
            ext => throw!("Unsupported file type: {}", ext),
          },
          data: new_bytes,
        };
        match artworks.get_mut(index) {
          Some(artwork) => {
            *artwork = new_artwork;
          }
          None => {
            if index == artworks.len() {
              artworks.push(new_artwork);
            } else {
              throw!("Index out of range");
            }
          }
        }
        tag.set_artworks(artworks);
      }
    }
    Ok(())
  }
  pub fn get_image(&self, index: usize) -> Option<Image> {
    match self {
      Tag::Id3(tag) => match tag.pictures().nth(index) {
        Some(pic) => Some(Image {
          index: index,
          total_images: tag.pictures().count(),
          data: &pic.data,
          mime_type: pic.mime_type.clone(),
        }),
        None => None,
      },
      Tag::Mp4(tag) => match tag.artworks().nth(index) {
        Some(artwork) => Some(Image {
          index: index,
          total_images: tag.artworks().count(),
          data: artwork.data,
          mime_type: match artwork.fmt {
            mp4ameta::ImgFmt::Bmp => "image/bmp".to_string(),
            mp4ameta::ImgFmt::Jpeg => "image/jpeg".to_string(),
            mp4ameta::ImgFmt::Png => "image/png".to_string(),
          },
        }),
        None => None,
      },
    }
  }
  pub fn remove_image(&mut self, index: usize) {
    match self {
      Tag::Id3(ref mut tag) => {
        let mut pic_frames: Vec<_> = tag
          .frames()
          .filter(|frame| frame.content().picture().is_some())
          .map(|frame| frame.clone())
          .collect();
        pic_frames.remove(index);
        tag.remove_all_pictures();
        for pic_frame in pic_frames {
          tag.add_frame(pic_frame);
        }
      }
      Tag::Mp4(ref mut tag) => {
        let mut artworks: Vec<_> = tag.take_artworks().collect();
        artworks.remove(index);
        tag.set_artworks(artworks);
      }
    }
  }
}

pub struct Image<'a> {
  index: usize,
  total_images: usize,
  mime_type: String,
  data: &'a [u8],
}
impl Image<'_> {
  pub fn to_js_obj(self, ctx: &CallContext) -> NResult<JsObject> {
    let mut image_obj = ctx.env.create_object()?;

    let index = ctx.env.create_uint32(self.index as u32)?;
    image_obj.set_named_property("index", index)?;

    let total_images = ctx.env.create_uint32(self.total_images as u32)?;
    image_obj.set_named_property("total_images", total_images)?;

    let mime_type = ctx.env.create_string(&self.mime_type)?;
    image_obj.set_named_property("mime_type", mime_type)?;

    let encoded_data = base64::encode(self.data);
    let data_str = ctx.env.create_string(&encoded_data)?;
    image_obj.set_named_property("data", data_str)?;

    Ok(image_obj)
  }
}

#[js_function(1)]
pub fn load_tags(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  data.current_tag = None;
  let track = id_arg_to_track(&ctx, 0)?;
  let old_path = data.paths.tracks_dir.join(&track.file);

  if !old_path.exists() {
    panic!("File does not exist: {}", track.file);
  }
  let ext = old_path.extension().unwrap_or_default().to_string_lossy();

  let tag = match ext.as_ref() {
    "mp3" => {
      let tag = match id3::Tag::read_from_path(&old_path) {
        Ok(tag) => tag,
        Err(_) => id3::Tag::new(),
      };
      Tag::Id3(tag)
    }
    "m4a" => {
      let tag = match mp4ameta::Tag::read_from_path(&old_path) {
        Ok(tag) => tag,
        Err(_) => panic!("No m4a tags found in file. Auto creating m4a tags is not yet supported"),
      };
      Tag::Mp4(tag)
    }
    _ => panic!("Unsupported file extension: {}", ext),
  };

  data.current_tag = Some(tag);

  return ctx.env.get_undefined();
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

  let image_obj = image.to_js_obj(&ctx)?;
  return Ok(image_obj.into_unknown());
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
  let new_info: TrackMD = serde_json::from_str(&arg_to_string(&ctx, 1)?)?;
  let old_path = data.paths.tracks_dir.join(&track.file);
  if !old_path.exists() {
    panic!("File does not exist: {}", track.file);
  }
  let ext = old_path.extension().unwrap_or_default().to_string_lossy();

  let tag = match &mut data.current_tag {
    Some(tag) => tag,
    None => throw!("No tag loaded"),
  };

  // name
  match new_info.name.as_ref() {
    "" => tag.remove_title(),
    value => tag.set_title(value),
  };
  let new_name = new_info.name.clone();

  // artists
  match new_info.artist.as_ref() {
    "" => tag.remove_artists(),
    value => tag.set_artist(value),
  };
  let new_artist = new_info.artist.clone();

  // album_name
  match new_info.albumName.as_ref() {
    "" => tag.remove_album(),
    value => tag.set_album(value),
  };
  let new_album_name = str_to_option(new_info.albumName);

  // album_artist
  match new_info.albumArtist.as_ref() {
    "" => tag.remove_album_artists(),
    value => tag.set_album_artist(value),
  };
  let new_album_artist = str_to_option(new_info.albumArtist);

  // composer
  match new_info.composer.as_ref() {
    "" => tag.remove_composers(),
    value => tag.set_composer(value),
  };
  let new_composer = str_to_option(new_info.composer);

  // grouping
  match new_info.grouping.as_ref() {
    "" => tag.remove_groupings(),
    value => tag.set_grouping(value),
  };
  let new_grouping = str_to_option(new_info.grouping);

  // genre
  match new_info.genre.as_ref() {
    "" => tag.remove_genres(),
    value => tag.set_genre(value),
  };
  let new_genre = str_to_option(new_info.genre);

  // year
  let new_year_i32 = match new_info.year.as_ref() {
    "" => None,
    value => Some(value.parse().expect("Invalid year")),
  };
  let new_year_i64 = new_year_i32.map(|n| i64::from(n));
  match new_year_i32 {
    None => tag.remove_year(),
    Some(value) => tag.set_year(value),
  };

  // track_number, track_count
  let new_track_number: Option<u32> = match new_info.trackNum.as_ref() {
    "" => None,
    value => Some(value.parse().expect("Invalid track number")),
  };
  let new_track_count: Option<u32> = match new_info.trackCount.as_ref() {
    "" => None,
    value => Some(value.parse().expect("Invalid track count")),
  };
  match tag.set_track_info(new_track_number, new_track_count) {
    Ok(()) => {}
    // don't set tag at all if number is required
    Err(SetInfoError::NumberRequired) => tag.set_track_info(None, None)?,
    Err(e) => Err(e)?,
  }

  // disc_number, disc_count
  let new_disc_number: Option<u32> = match new_info.discNum.as_ref() {
    "" => None,
    value => Some(value.parse().expect("Invalid disc number")),
  };
  let new_disc_count: Option<u32> = match new_info.discCount.as_ref() {
    "" => None,
    value => Some(value.parse().expect("Invalid disc count")),
  };
  match tag.set_disc_info(new_disc_number, new_disc_count) {
    Ok(()) => {}
    // don't set tag at all if number is required
    Err(SetInfoError::NumberRequired) => tag.set_disc_info(None, None)?,
    Err(e) => Err(e)?,
  };

  // comment
  match new_info.comments.as_ref() {
    "" => tag.remove_comments(),
    value => tag.set_comment(value),
  };
  let new_comments = str_to_option(new_info.comments);

  // save tag
  tag.write_to_path(&old_path);

  // move file
  if new_name != track.name || new_artist != track.artist {
    let dir = &data.paths.tracks_dir;
    let new_filename = generate_filename(dir, &new_artist, &new_name, &ext);
    let new_path = dir.join(&new_filename);
    match fs::rename(old_path, new_path) {
      Ok(_) => {
        track.file = new_filename;
      }
      Err(_) => {}
    }
  }

  track.name = new_name;
  track.artist = new_artist;
  track.albumName = new_album_name;
  track.albumArtist = new_album_artist;
  track.composer = new_composer;
  track.grouping = new_grouping;
  track.genre = new_genre;
  track.year = new_year_i64;
  track.trackNum = new_track_number;
  track.trackCount = new_track_count;
  track.discNum = new_disc_number;
  track.discCount = new_disc_count;
  track.comments = new_comments;

  return ctx.env.get_undefined();
}
