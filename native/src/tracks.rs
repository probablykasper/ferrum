use crate::data::Data;
use crate::data_js::get_data;
use crate::js::{arg_to_number, arg_to_string, nerr};
use crate::library_types::Track;
use crate::{get_now_timestamp, str_to_option, sys_time_to_timestamp};
use atomicwrites::{AtomicFile, DisallowOverwrite};
use id3;
use mp3_metadata;
use mp4ameta;
use napi::{
  CallContext, Env, JsArrayBuffer, JsObject, JsUndefined, JsUnknown, Result as NResult, Task,
};
use napi_derive::js_function;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
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

  let mut artwork_path = None;
  let mut artwork_data = None;
  for picture in tag.pictures() {
    let ext = match picture.mime_type.as_str() {
      "image/jpeg" => "jpg",
      "image/png" => "png",
      _ => continue,
    };
    match picture.picture_type {
      id3::frame::PictureType::Other => {}
      id3::frame::PictureType::Undefined(_) => {}
      id3::frame::PictureType::CoverFront => {}
      _ => continue,
    }
    let artwork_filename = filename.to_owned() + "." + ext;
    let artwork_path_x = data.paths.artworks_dir.join(artwork_filename);
    match Path::exists(&artwork_path_x) {
      true => panic!(
        "Artwork path already exists: {}",
        artwork_path_x.to_string_lossy().into_owned()
      ),
      false => {}
    }
    artwork_path = Some(artwork_path_x);
    artwork_data = Some(&picture.data);
  }

  fs::copy(track_path, &dest_path).expect("Error copying file");

  if tag_changed {
    tag
      .write_to_path(&dest_path, id3::Version::Id3v24)
      .expect("Unable to tag file");
    // manually set date_modified because the date_modified doens't seem to
    // immediately update after tag.write_to_path().
    date_modified = now;
  }

  // copy artwork
  if let Some(artwork_path) = artwork_path {
    if let Some(artwork_data) = artwork_data {
      let af = AtomicFile::new(artwork_path, DisallowOverwrite);
      match af.write(|f| f.write_all(&artwork_data)) {
        Ok(_) => {}
        Err(err) => panic!("Error writing cover: {}", err),
      }
    }
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
  comments: String,
}

#[js_function(2)]
pub fn update_track_info(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  let track = id_arg_to_track(&ctx, 0)?;
  let new_info: TrackMD = serde_json::from_str(&arg_to_string(&ctx, 1)?)?;
  let old_path_str = data.paths.tracks_dir.join(&track.file);
  let old_path = Path::new(&old_path_str);
  if !old_path.exists() {
    panic!("File does not exist: {}", track.file);
  }
  let ext = old_path.extension().unwrap_or_default().to_string_lossy();

  enum Tag {
    Id3(id3::Tag),
    Mp4(mp4ameta::Tag),
  }
  let mut tag = match ext.as_ref() {
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

  let name = {
    match tag {
      Tag::Id3(ref mut tag) => match &*new_info.name {
        "" => tag.remove_title(),
        value => tag.set_title(value),
      },
      Tag::Mp4(ref mut tag) => match &*new_info.name {
        "" => tag.remove_title(),
        value => tag.set_title(value),
      },
    }
    new_info.name.clone()
  };
  let artist = {
    match tag {
      Tag::Id3(ref mut tag) => match &*new_info.artist {
        "" => tag.remove_artist(),
        value => tag.set_artist(value),
      },
      Tag::Mp4(ref mut tag) => match &*new_info.artist {
        "" => tag.remove_artists(),
        value => tag.set_artist(value),
      },
    }
    new_info.artist.clone()
  };
  let album_name = {
    match tag {
      Tag::Id3(ref mut tag) => match &*new_info.albumName {
        "" => tag.remove_album(),
        value => tag.set_album(value),
      },
      Tag::Mp4(ref mut tag) => match &*new_info.albumName {
        "" => tag.remove_album(),
        value => tag.set_album(value),
      },
    }
    str_to_option(new_info.albumName)
  };
  let album_artist = {
    match tag {
      Tag::Id3(ref mut tag) => match &*new_info.albumArtist {
        "" => tag.remove_album_artist(),
        value => tag.set_album_artist(value),
      },
      Tag::Mp4(ref mut tag) => match &*new_info.albumArtist {
        "" => tag.remove_album_artists(),
        value => tag.set_album_artist(value),
      },
    }
    str_to_option(new_info.albumArtist)
  };
  let composer = {
    match tag {
      Tag::Id3(ref mut tag) => match &*new_info.composer {
        "" => tag.remove("TCOM"),
        value => tag.set_text("TCOM", value),
      },
      Tag::Mp4(ref mut tag) => match &*new_info.composer {
        "" => tag.remove_composers(),
        value => tag.set_composer(value),
      },
    }
    str_to_option(new_info.composer)
  };
  let grouping = {
    match tag {
      Tag::Id3(ref mut tag) => match &*new_info.grouping {
        "" => tag.remove("GRP1"),
        value => tag.set_text("GRP1", value),
      },
      Tag::Mp4(ref mut tag) => match &*new_info.grouping {
        "" => tag.remove_groupings(),
        value => tag.set_grouping(value),
      },
    }
    str_to_option(new_info.grouping)
  };
  let genre = {
    match tag {
      Tag::Id3(ref mut tag) => match &*new_info.genre {
        "" => tag.remove_genre(),
        value => tag.set_genre(value),
      },
      Tag::Mp4(ref mut tag) => match &*new_info.genre {
        "" => tag.remove_genres(),
        value => tag.set_genre(value),
      },
    }
    str_to_option(new_info.genre)
  };
  let parsed_year = match &*new_info.year {
    "" => None,
    value => Some(value.parse().expect("Invalid year")),
  };
  let i64_year = match parsed_year {
    None => None,
    Some(value) => Some(i64::from(value)),
  };
  let year = {
    match tag {
      Tag::Id3(ref mut tag) => match parsed_year {
        None => {
          tag.remove_year();
          tag.remove_date_recorded();
        }
        Some(value) => {
          tag.set_year(value);
          tag.set_date_recorded(timestamp_from_year(value));
        }
      },
      Tag::Mp4(ref mut tag) => match parsed_year {
        None => tag.remove_year(),
        Some(value) => tag.set_year(value.to_string()),
      },
    }
    i64_year
  };
  let comments = {
    match tag {
      Tag::Id3(ref mut tag) => {
        tag.remove("COMM");
        match &*new_info.comments {
          "" => {}
          value => tag.add_comment(id3::frame::Comment {
            lang: "eng".to_string(),
            description: "".to_string(),
            text: value.to_string(),
          }),
        };
      }
      Tag::Mp4(ref mut tag) => {
        tag.remove_comments();
        match &*new_info.comments {
          "" => {}
          value => tag.add_comment(value),
        };
      }
    };
    str_to_option(new_info.comments)
  };

  match tag {
    Tag::Id3(ref mut tag) => {
      match tag.write_to_path(old_path, id3::Version::Id3v24) {
        Ok(_) => {}
        Err(e) => panic!("Unable to tag file: {}", e.description),
      };
    }
    Tag::Mp4(ref mut tag) => {
      match tag.write_to_path(old_path) {
        Ok(_) => (),
        Err(e) => panic!("Unable to tag file: {}", e.description),
      };
    }
  }

  // move file
  if new_info.name != track.name || new_info.artist != track.artist {
    let new_filename = generate_filename(
      &data.paths.tracks_dir,
      &new_info.artist,
      &new_info.name,
      ext.as_ref(),
    );
    let new_path_str = data.paths.tracks_dir.join(&new_filename);
    let new_path = Path::new(&new_path_str);
    match fs::rename(old_path, new_path) {
      Ok(_) => {
        track.file = new_filename;
      }
      Err(_) => {}
    }
  }

  track.name = name;
  track.artist = artist;
  track.albumName = album_name;
  track.albumArtist = album_artist;
  track.composer = composer;
  track.grouping = grouping;
  track.genre = genre;
  track.year = year;
  track.comments = comments;

  return ctx.env.get_undefined();
}
