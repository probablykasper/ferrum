use crate::data::Data;
use crate::data_js::get_data;
use crate::js::{arg_to_number, arg_to_string, nerr};
use crate::library_types::Track;
use crate::{get_now_timestamp, sys_time_to_timestamp};
use atomicwrites::{AtomicFile, DisallowOverwrite};
use id3;
use mp3_metadata;
use napi::{CallContext, JsUndefined, JsUnknown, Result as NResult};
use napi_derive::js_function;
use std::fs;
use std::io::Write;
use std::path::Path;

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
  let data: &mut Data = get_data(&ctx)?;
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
  data.save()?;
  return ctx.env.get_undefined();
}

#[js_function(1)]
pub fn add_skip(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
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
  data.save()?;
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
  data.save()?;
  return ctx.env.get_undefined();
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

  let mut file_num: u32 = 0;
  let mut filename = beginning.clone() + ext;
  for i in 0..9999 {
    if i == 1000 {
      panic!("Already got 500 files with that artist and title")
    }
    let full_path = dest_dir.join(&filename);
    if full_path.exists() {
      file_num += 1;
      filename = beginning.clone() + " " + file_num.to_string().as_str() + ext;
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
  let ext = match path.extension() {
    Some(os_str) => os_str.to_str().expect("Unable to read file extension"),
    None => panic!("No file extension found"),
  };
  let track = match ext {
    "mp3" => import_mp3(&data, &path),
    _ => panic!("Unsupported file extension: {}", ext),
  };
  let id = crate::data::make_id(&data.library);
  data.library.tracks.insert(id, track);
  return ctx.env.get_undefined();
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
  let filename = generate_filename(&tracks_dir, artist.unwrap_or(""), &title, ".mp3");
  let dest_path = tracks_dir.join(&filename);

  let mut artwork_path = None;
  let mut artwork_data = None;
  for picture in tag.pictures() {
    let ext = match picture.mime_type.as_str() {
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
    let artwork_filename = filename.to_owned() + ext;
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
    artist: artist.map(|s| s.to_owned()),
    composer: get_frame_text(&tag, "TCOM"),
    sortName: get_frame_text(&tag, "TSOT"),
    sortArtist: get_frame_text(&tag, "TSOP"),
    sortComposer: get_frame_text(&tag, "TSOC"),
    genre: tag.genre().map(|s| s.to_owned()),
    rating: None,
    year: tag.year().map(|n| i64::from(n)),
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
