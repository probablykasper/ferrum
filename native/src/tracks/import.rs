use crate::data::Data;
use crate::library_types::Track;
use crate::tracks::{generate_filename, tag};
use crate::{get_now_timestamp, sys_time_to_timestamp};
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

pub fn import_mp3(data: &Data, track_path: &Path) -> Track {
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
