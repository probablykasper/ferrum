use crate::data::Data;
use crate::library_types::Track;
use crate::tracks::{generate_filename, tag};
use crate::{get_now_timestamp, sys_time_to_timestamp, UniResult};
use mp3_metadata;
use std::fs;
use std::path::Path;

fn get_and_fix_id3_year(tag: &mut id3::Tag) -> Option<i64> {
  match tag.date_recorded() {
    Some(tdrc) => Some(i64::from(tdrc.year)),
    None => match tag.year() {
      Some(tyer) => {
        let x = tag::id3_timestamp_from_year(tyer);
        tag.set_date_recorded(x);
        Some(i64::from(tyer))
      }
      None => match tag.date_released() {
        Some(tdrl) => {
          tag.set_date_recorded(tag::id3_timestamp_from_year(tdrl.year));
          Some(i64::from(tdrl.year))
        }
        None => None,
      },
    },
  }
}

fn get_first_text_m4a(tag: &mp4ameta::Tag, id: [u8; 4]) -> Option<String> {
  let fourcc = mp4ameta::Fourcc(id);
  let mut frames = tag.data_of(&fourcc);
  let data = match frames.next() {
    Some(data) => data,
    None => return None,
  };
  match data.string() {
    Some(s) => Some(s.to_string()),
    None => None,
  }
}

fn read_file_metadata(path: &Path) -> UniResult<fs::Metadata> {
  match fs::metadata(&path) {
    Ok(md) => Ok(md),
    Err(e) => throw!("Unable to read file metadata: {}", e),
  }
}

pub fn import_m4a(data: &Data, track_path: &Path) -> UniResult<Track> {
  let file_md = read_file_metadata(&track_path)?;
  let now = get_now_timestamp();

  let mut date_modified = match file_md.modified() {
    Ok(sys_time) => sys_time_to_timestamp(&sys_time),
    Err(_) => now,
  };

  let mut tag_changed = false;
  let mut tag = match mp4ameta::Tag::read_from_path(&track_path) {
    Ok(tag) => tag,
    Err(e) => match e.kind {
      mp4ameta::ErrorKind::NoTag => {
        throw!("No m4a tags found in file. Auto creating m4a tags is not yet supported")
      }
      _ => {
        throw!("Error reading m4a tags: {}", e)
      }
    },
  };

  let audio_info = tag.audio_info();
  let duration = match audio_info.duration {
    Some(duration) => duration,
    None => throw!("Unable to read duration of m4a file"),
  };
  let bitrate = match audio_info.avg_bitrate {
    Some(bitrate) => bitrate,
    None => throw!("Unable to read bitrate of m4a file"),
  };
  let sample_rate = match audio_info.sample_rate {
    Some(sample_rate) => sample_rate,
    None => throw!("Unable to read sample rate of m4a file"),
  };

  let year = match tag.year() {
    Some(year_str) => match year_str.parse() {
      Ok(year) => Some(year),
      Err(e) => throw!("Unable to read year of m4a file: {}", e),
    },
    None => None,
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
  let filename = generate_filename(&tracks_dir, artist.unwrap_or(""), &title, "m4a");
  let dest_path = tracks_dir.join(&filename);

  fs::copy(track_path, &dest_path).expect("Error copying file");
  println!(
    "{} -> {}",
    track_path.to_string_lossy(),
    dest_path.to_string_lossy()
  );

  if tag_changed {
    println!("Writing:::::::");
    tag.write_to_path(&dest_path).expect("Unable to tag file");
    // manually set date_modified because the date_modified doens't seem to
    // immediately update after tag.write_to_path().
    date_modified = now;
  }
  println!("Images: {:?}", tag.images().collect::<Vec<_>>().len());

  // assign to variable first due to lifetimes
  let track = Track {
    size: file_md.len() as i64,
    duration: duration.as_secs_f64(),
    bitrate: bitrate.into(),
    sampleRate: sample_rate.hz().into(),
    file: filename,
    dateModified: date_modified,
    dateAdded: now,
    name: title.to_string(),
    importedFrom: None,
    originalId: None,
    artist: artist.unwrap_or_default().to_string(),
    composer: tag.composer().map(|s| s.to_string()),
    sortName: get_first_text_m4a(&tag, *b"sonm"),
    sortArtist: get_first_text_m4a(&tag, *b"soar"),
    sortComposer: get_first_text_m4a(&tag, *b"soco"),
    genre: tag.genre().map(|s| s.to_owned()),
    rating: None,
    year,
    bpm: tag.bpm().map(|bpm| bpm.into()),
    comments: tag.comment().map(|g| g.to_string()),
    grouping: tag.grouping().map(|g| g.to_string()),
    liked: None,
    disliked: None,
    disabled: None,
    compilation: None,
    albumName: tag.album().map(|s| s.to_owned()),
    albumArtist: tag.album_artist().map(|s| s.to_owned()),
    sortAlbumName: get_first_text_m4a(&tag, *b"soal"),
    sortAlbumArtist: get_first_text_m4a(&tag, *b"soaa"),
    trackNum: tag.track_number().map(|n| n.into()),
    trackCount: tag.total_tracks().map(|n| n.into()),
    discNum: tag.disc_number().map(|n| n.into()),
    discCount: tag.total_discs().map(|n| n.into()),
    dateImported: None,
    playCount: None,
    plays: None,
    playsImported: None,
    skipCount: None,
    skips: None,
    skipsImported: None,
    volume: None,
  };
  Ok(track)
}

fn get_first_text_id3(tag: &id3::Tag, id: &str) -> Option<String> {
  let frame = tag.get(id)?;
  let text = frame.content().text()?;
  return Some(text.to_owned());
}
pub fn import_mp3(data: &Data, track_path: &Path) -> UniResult<Track> {
  let file_md = read_file_metadata(&track_path)?;
  let now = get_now_timestamp();

  let mut date_modified = match file_md.modified() {
    Ok(sys_time) => sys_time_to_timestamp(&sys_time),
    Err(_) => now,
  };

  let mp3_md = match mp3_metadata::read_from_file(&track_path) {
    Ok(md) => md,
    Err(e) => throw!("Error reading mp3 metadata: {}", e),
  };
  let duration = mp3_md.duration.as_secs_f64();
  let sample_rate = match mp3_md.frames.get(0) {
    Some(frame) => frame.sampling_freq as f64,
    None => throw!("Unable to read first audio frame"),
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

  let year = get_and_fix_id3_year(&mut tag);

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

  // assign to variable first due to lifetimes
  let track = Track {
    size: file_md.len() as i64,
    duration,
    bitrate,
    sampleRate: sample_rate,
    file: filename,
    dateModified: date_modified,
    dateAdded: now,
    name: title.to_string(),
    importedFrom: None,
    originalId: None,
    artist: artist.unwrap_or_default().to_string(),
    composer: get_first_text_id3(&tag, "TCOM"),
    sortName: get_first_text_id3(&tag, "TSOT"),
    sortArtist: get_first_text_id3(&tag, "TSOP"),
    sortComposer: get_first_text_id3(&tag, "TSOC"),
    genre: tag.genre().map(|s| s.to_owned()),
    rating: None,
    year: year,
    bpm: match get_first_text_id3(&tag, "TBPM") {
      Some(n) => n.parse().ok(),
      None => None,
    },
    comments: tag.comments().next().map(|c| c.text.clone()),
    grouping: get_first_text_id3(&tag, "GRP1"),
    liked: None,
    disliked: None,
    disabled: None,
    compilation: None,
    albumName: tag.album().map(|s| s.to_owned()),
    albumArtist: tag.album_artist().map(|s| s.to_owned()),
    sortAlbumName: get_first_text_id3(&tag, "TSOA"),
    sortAlbumArtist: get_first_text_id3(&tag, "TSO2"),
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
  Ok(track)
}
