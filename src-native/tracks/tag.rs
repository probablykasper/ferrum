use crate::{UniError, UniResult};
use id3::{self, TagLike};
use lofty::{Accessor, TagExt, TaggedFileExt};
use mp4ameta;
use std::io::Cursor;
use std::path::{Path, PathBuf};

pub enum SetInfoError {
  NumberRequired,
  Other(String),
}
impl ToString for SetInfoError {
  fn to_string(self: &SetInfoError) -> String {
    match self {
      SetInfoError::NumberRequired => "Number required".to_string(),
      SetInfoError::Other(s) => s.to_string(),
    }
  }
}
impl From<SetInfoError> for napi::Error {
  fn from(err: SetInfoError) -> napi::Error {
    napi::Error::from_reason(err.to_string())
  }
}
impl From<SetInfoError> for UniError {
  fn from(err: SetInfoError) -> UniError {
    err.to_string().into()
  }
}

pub fn id3_timestamp_from_year(year: i32) -> id3::Timestamp {
  return id3::Timestamp {
    year,
    month: None,
    day: None,
    hour: None,
    minute: None,
    second: None,
  };
}

pub struct Image {
  // i64 because napi doesn't support u64
  pub index: i64,
  pub total_images: i64,
  pub mime_type: String,
  pub data: Vec<u8>,
}
pub struct ImageRef<'a> {
  // i64 because napi doesn't support u64
  pub index: i64,
  pub total_images: i64,
  pub mime_type: String,
  pub data: &'a [u8],
}

pub enum Tag {
  Id3(id3::Tag),
  Mp4(mp4ameta::Tag),
  Lofty(lofty::Tag),
}
impl Tag {
  pub fn read_from_path(path: &PathBuf) -> UniResult<Tag> {
    if !path.exists() {
      throw!("File does not exist: {}", path.to_string_lossy());
    }
    let ext = path.extension().unwrap_or_default().to_string_lossy();

    let tag = match ext.as_ref() {
      "mp3" => {
        let tag = match id3::Tag::read_from_path(&path) {
          Ok(tag) => tag,
          Err(_) => id3::Tag::new(),
        };
        Tag::Id3(tag)
      }
      "m4a" => {
        let tag = match mp4ameta::Tag::read_from_path(&path) {
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
        Tag::Mp4(tag)
      }
      "opus" => {
        let probe = match lofty::Probe::open(path) {
          Ok(f) => {
            let parse_options = lofty::ParseOptions::new()
              .read_properties(false)
              .parsing_mode(lofty::ParsingMode::Strict);
            f.options(parse_options)
          }
          Err(e) => throw!("File does not exist: {}", e),
        };

        let mut tagged_file = match probe.read() {
          Ok(f) => f,
          Err(e) => throw!("Unable to read file: {}", e),
        };

        let tag = match tagged_file.remove(lofty::TagType::VorbisComments) {
          Some(t) => t,
          None => lofty::Tag::new(lofty::TagType::VorbisComments),
        };
        Tag::Lofty(tag)
      }
      _ => throw!("Unsupported file extension: {}", ext),
    };
    Ok(tag)
  }
  pub fn write_to_path(&mut self, path: &Path) -> UniResult<()> {
    match self {
      Tag::Id3(tag) => {
        match tag.write_to_path(path, id3::Version::Id3v24) {
          Ok(_) => {}
          Err(e) => throw!("Unable to tag file: {}", e.description),
        };
      }
      Tag::Mp4(tag) => {
        match tag.write_to_path(path) {
          Ok(_) => {}
          Err(e) => throw!("Unable to tag file: {}", e.description),
        };
      }
      Tag::Lofty(tag) => {
        match tag.save_to_path(path) {
          Ok(_) => {}
          Err(e) => throw!("Unable to tag file: {}", e),
        };
      }
    };
    Ok(())
  }
  pub fn remove_title(&mut self) {
    match self {
      Tag::Id3(tag) => tag.remove_title(),
      Tag::Mp4(tag) => tag.remove_title(),
      Tag::Lofty(tag) => tag.remove_title(),
    }
  }
  pub fn set_title(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_title(value),
      Tag::Mp4(tag) => tag.set_title(value),
      Tag::Lofty(tag) => tag.set_title(value.to_string()),
    }
  }
  pub fn remove_artists(&mut self) {
    match self {
      Tag::Id3(tag) => tag.remove_artist(),
      Tag::Mp4(tag) => tag.remove_artists(),
      Tag::Lofty(tag) => tag.remove_artist(),
    }
  }
  pub fn set_artist(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_artist(value),
      Tag::Mp4(tag) => tag.set_artist(value),
      Tag::Lofty(tag) => tag.set_artist(value.to_string()),
    }
  }
  pub fn remove_album(&mut self) {
    match self {
      Tag::Id3(tag) => tag.remove_album(),
      Tag::Mp4(tag) => tag.remove_album(),
      Tag::Lofty(tag) => tag.remove_album(),
    }
  }
  pub fn set_album(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_album(value),
      Tag::Mp4(tag) => tag.set_album(value),
      Tag::Lofty(tag) => tag.set_album(value.to_string()),
    }
  }
  pub fn remove_album_artists(&mut self) {
    match self {
      Tag::Id3(tag) => tag.remove_album_artist(),
      Tag::Mp4(tag) => tag.remove_album_artists(),
      Tag::Lofty(tag) => {
        let _ = tag.remove_key(&lofty::ItemKey::AlbumArtist);
      }
    }
  }
  pub fn set_album_artist(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_album_artist(value),
      Tag::Mp4(tag) => tag.set_album_artist(value),
      Tag::Lofty(tag) => {
        let inserted = tag.insert_text(lofty::ItemKey::AlbumArtist, value.to_string());
        assert!(inserted, "Failed to set album artist");
      }
    }
  }
  pub fn remove_composers(&mut self) {
    match self {
      Tag::Id3(tag) => {
        tag.remove("TCOM");
      }
      Tag::Mp4(tag) => tag.remove_composers(),
      Tag::Lofty(tag) => {
        let _ = tag.remove_key(&lofty::ItemKey::Composer);
      }
    }
  }
  pub fn set_composer(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_text("TCOM", value),
      Tag::Mp4(tag) => tag.set_composer(value),
      Tag::Lofty(tag) => {
        let inserted = tag.insert_text(lofty::ItemKey::Composer, value.to_string());
        assert!(inserted, "Failed to set composer");
      }
    }
  }
  pub fn remove_groupings(&mut self) {
    match self {
      Tag::Id3(tag) => {
        tag.remove("GRP1");
      }
      Tag::Mp4(tag) => tag.remove_groupings(),
      Tag::Lofty(tag) => {
        let _ = tag.remove_key(&lofty::ItemKey::ContentGroup);
      }
    }
  }
  pub fn set_grouping(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_text("GRP1", value),
      Tag::Mp4(tag) => tag.set_grouping(value),
      Tag::Lofty(tag) => {
        let inserted = tag.insert_text(lofty::ItemKey::ContentGroup, value.to_string());
        assert!(inserted, "Failed to set grouping");
      }
    }
  }
  pub fn remove_genres(&mut self) {
    match self {
      Tag::Id3(tag) => tag.remove_genre(),
      Tag::Mp4(tag) => tag.remove_genres(),
      Tag::Lofty(tag) => tag.remove_genre(),
    }
  }
  pub fn set_genre(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => tag.set_genre(value),
      Tag::Mp4(tag) => tag.set_genre(value),
      Tag::Lofty(tag) => tag.set_genre(value.to_string()),
    }
  }
  pub fn remove_year(&mut self) {
    match self {
      Tag::Id3(tag) => {
        tag.remove_year();
        tag.remove_date_recorded();
      }
      Tag::Mp4(tag) => tag.remove_year(),
      Tag::Lofty(tag) => tag.remove_year(),
    }
  }
  pub fn set_year(&mut self, value: i32) {
    match self {
      Tag::Id3(tag) => {
        tag.set_year(value);
        tag.set_date_recorded(id3_timestamp_from_year(value));
      }
      Tag::Mp4(tag) => tag.set_year(value.to_string()),
      Tag::Lofty(tag) => {
        let u = if value < 0 { 0 } else { value as u32 };
        tag.set_year(u);
      }
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
      Tag::Lofty(tag) => {
        match number {
          Some(number) => tag.set_track(number),
          None => tag.remove_track(),
        }
        match total {
          Some(total) => tag.set_track_total(total),
          None => tag.remove_track_total(),
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
      Tag::Lofty(tag) => {
        match number {
          Some(number) => tag.set_disk(number),
          None => tag.remove_disk(),
        }
        match total {
          Some(total) => tag.set_disk_total(total),
          None => tag.remove_disk_total(),
        }
      }
    }
    Ok(())
  }
  pub fn remove_bpm(&mut self) {
    match self {
      Tag::Id3(tag) => {
        tag.remove("TBPM");
      }
      Tag::Mp4(tag) => tag.remove_bpm(),
      Tag::Lofty(tag) => {
        let _ = tag.remove_key(&lofty::ItemKey::Bpm);
      }
    };
  }
  pub fn set_bpm(&mut self, value: u16) {
    match self {
      Tag::Id3(tag) => {
        tag.set_text("TBPM", value.to_string());
      }
      Tag::Mp4(tag) => {
        tag.set_bpm(value);
      }
      Tag::Lofty(tag) => {
        let inserted = tag.insert_text(lofty::ItemKey::Bpm, value.to_string());
        assert!(inserted, "Failed to set BPM");
      }
    };
  }
  pub fn remove_comments(&mut self) {
    match self {
      Tag::Id3(tag) => {
        tag.remove("COMM");
      }
      Tag::Mp4(tag) => tag.remove_comments(),
      Tag::Lofty(tag) => tag.remove_comment(),
    };
  }
  pub fn set_comment(&mut self, value: &str) {
    match self {
      Tag::Id3(tag) => {
        tag.remove_comment(None, None);
        tag.add_frame(id3::frame::Comment {
          lang: "eng".to_string(),
          description: "".to_string(),
          text: value.to_string(),
        });
      }
      Tag::Mp4(tag) => tag.set_comment(value),
      Tag::Lofty(tag) => tag.set_comment(value.to_string()),
    }
  }
  pub fn set_image(&mut self, index: usize, data: Vec<u8>, mime_type: &str) -> UniResult<()> {
    match self {
      Tag::Id3(tag) => {
        let mut pic_frames: Vec<_> = tag
          .frames()
          .filter(|frame| frame.content().picture().is_some())
          .map(|frame| frame.clone())
          .collect();
        let mut new_pic = id3::frame::Picture {
          mime_type: match mime_type {
            "image/jpeg" | "image/png" => mime_type.to_string(),
            ext => throw!("Unsupported file type: {}", ext),
          },
          picture_type: id3::frame::PictureType::Other,
          description: "".to_string(),
          data,
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
          fmt: match mime_type {
            "image/jpeg" => mp4ameta::ImgFmt::Jpeg,
            "image/png" => mp4ameta::ImgFmt::Png,
            "image/bmp" => mp4ameta::ImgFmt::Bmp,
            ext => throw!("Unsupported file type: {}", ext),
          },
          data,
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
      Tag::Lofty(tag) => {
        let mut reader = Cursor::new(data);
        let picture = match lofty::Picture::from_reader(&mut reader) {
          Ok(picture) => picture,
          Err(e) => throw!("Unable to read picture: {}", e),
        };
        match picture.mime_type() {
          Some(lofty::MimeType::Png | lofty::MimeType::Jpeg) => {
            tag.set_picture(index, picture);
          }
          _ => throw!("Unsupported picture type"),
        }
      }
    }
    Ok(())
  }
  pub fn get_image_ref(&self, index: usize) -> Option<ImageRef> {
    match self {
      Tag::Id3(tag) => match tag.pictures().nth(index) {
        Some(pic) => Some(ImageRef {
          index: index.try_into().expect("usize conv"),
          total_images: tag.pictures().count().try_into().expect("usize conv"),
          data: &pic.data,
          mime_type: pic.mime_type.clone(),
        }),
        None => None,
      },
      Tag::Mp4(tag) => match tag.artworks().nth(index) {
        Some(artwork) => Some(ImageRef {
          index: index.try_into().expect("usize conv"),
          total_images: tag.artworks().count().try_into().expect("usize conv"),
          data: artwork.data,
          mime_type: match artwork.fmt {
            mp4ameta::ImgFmt::Bmp => "image/bmp".to_string(),
            mp4ameta::ImgFmt::Jpeg => "image/jpeg".to_string(),
            mp4ameta::ImgFmt::Png => "image/png".to_string(),
          },
        }),
        None => None,
      },
      Tag::Lofty(tag) => {
        let pictures = tag.pictures();
        match pictures.get(index) {
          Some(pic) => {
            let data = pic.data();
            Some(ImageRef {
              index: index.try_into().expect("usize conv"),
              total_images: pictures.len().try_into().expect("usize conv"),
              data,
              mime_type: match pic.mime_type() {
                Some(mime_type) => mime_type.to_string(),
                _ => return None,
              },
            })
          }
          None => None,
        }
      }
    }
  }
  pub fn get_image_consume(self, index: usize) -> Option<Image> {
    match self {
      Tag::Id3(tag) => match tag.pictures().nth(index) {
        Some(pic) => Some(Image {
          index: index.try_into().expect("usize conv"),
          total_images: tag.pictures().count().try_into().expect("usize conv"),
          data: pic.data.to_vec(),
          mime_type: pic.mime_type.clone(),
        }),
        None => None,
      },
      Tag::Mp4(mut tag) => {
        let total_images = tag.artworks().count().try_into().expect("usize conv");
        match tag.take_artworks().nth(index) {
          Some(artwork) => Some(Image {
            index: index.try_into().expect("usize conv"),
            total_images,
            data: artwork.data,
            mime_type: match artwork.fmt {
              mp4ameta::ImgFmt::Bmp => "image/bmp".to_string(),
              mp4ameta::ImgFmt::Jpeg => "image/jpeg".to_string(),
              mp4ameta::ImgFmt::Png => "image/png".to_string(),
            },
          }),
          None => None,
        }
      }
      Tag::Lofty(mut tag) => {
        let pictures_len = tag.pictures().len();
        if tag.picture_count() <= index.try_into().expect("usize conv") {
          return None;
        }
        let pic = tag.remove_picture(index);
        Some(Image {
          index: index.try_into().expect("usize conv"),
          total_images: pictures_len.try_into().expect("usize conv"),
          mime_type: match pic.mime_type() {
            Some(mime_type) => mime_type.to_string(),
            _ => return None,
          },
          data: pic.into_data(),
        })
      }
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
      Tag::Lofty(tag) => {
        tag.remove_picture(index);
      }
    }
  }
}
