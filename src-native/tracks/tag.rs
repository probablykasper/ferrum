use crate::{UniError, UniResult};
use lofty::picture::{MimeType, Picture};
use lofty::tag::ItemKey;
use lofty::{file::TaggedFileExt, tag::Accessor, tag::TagExt};
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

pub struct Image {
	pub data: Vec<u8>,
}
pub struct ImageRef<'a> {
	// i64 because napi doesn't support u64
	pub index: i64,
	pub total_images: i64,
	pub mime_type: MimeType,
	pub data: &'a [u8],
}

pub struct Tag {
	tag: lofty::tag::Tag,
}
impl Tag {
	pub fn read_from_path(path: &PathBuf) -> UniResult<Tag> {
		if !path.exists() {
			throw!("File does not exist: {}", path.to_string_lossy());
		}
		let ext = path.extension().unwrap_or_default().to_string_lossy();

		let tag = match ext.as_ref() {
			"mp3" | "m4a" | "opus" => {
				let probe = match lofty::probe::Probe::open(path) {
					Ok(f) => {
						let parse_options = lofty::config::ParseOptions::new()
							.read_properties(false)
							.parsing_mode(lofty::config::ParsingMode::Strict);
						f.options(parse_options)
					}
					Err(e) => throw!("File does not exist: {}", e),
				};

				let mut tagged_file = match probe.read() {
					Ok(f) => f,
					Err(e) => throw!("Unable to read file: {}", e),
				};

				let tag = match tagged_file.remove(tagged_file.primary_tag_type()) {
					Some(t) => t.clone(),
					None => lofty::tag::Tag::new(tagged_file.primary_tag_type()),
				};

				Tag { tag }
			}
			_ => throw!("Unsupported file extension: {}", ext),
		};
		Ok(tag)
	}
	pub fn write_to_path(&mut self, path: &Path) -> UniResult<()> {
		match self
			.tag
			.save_to_path(path, lofty::config::WriteOptions::default())
		{
			Ok(_) => {}
			Err(e) => throw!("Unable to tag file: {}", e),
		};
		Ok(())
	}
	pub fn remove_title(&mut self) {
		self.tag.remove_title()
	}
	pub fn set_title(&mut self, value: &str) {
		self.tag.set_title(value.to_string())
	}
	pub fn remove_artists(&mut self) {
		self.tag.remove_artist()
	}
	pub fn set_artist(&mut self, value: &str) {
		self.tag.set_artist(value.to_string())
	}
	pub fn remove_album(&mut self) {
		self.tag.remove_album()
	}
	pub fn set_album(&mut self, value: &str) {
		self.tag.set_album(value.to_string())
	}
	pub fn remove_album_artists(&mut self) {
		self.tag.remove_key(&ItemKey::AlbumArtist);
	}
	pub fn set_album_artist(&mut self, value: &str) {
		let inserted = self
			.tag
			.insert_text(ItemKey::AlbumArtist, value.to_string());
		assert!(inserted, "Failed to set album artist");
	}
	pub fn remove_composers(&mut self) {
		self.tag.remove_key(&ItemKey::Composer);
	}
	pub fn set_composer(&mut self, value: &str) {
		let inserted = self.tag.insert_text(ItemKey::Composer, value.to_string());
		assert!(inserted, "Failed to set composer");
	}
	pub fn remove_groupings(&mut self) {
		self.tag.remove_key(&ItemKey::ContentGroup)
	}
	pub fn set_grouping(&mut self, value: &str) {
		let inserted = self
			.tag
			.insert_text(ItemKey::ContentGroup, value.to_string());
		assert!(inserted, "Failed to set grouping");
	}
	pub fn remove_genres(&mut self) {
		self.tag.remove_genre()
	}
	pub fn set_genre(&mut self, value: &str) {
		self.tag.set_genre(value.to_string())
	}
	pub fn remove_year(&mut self) {
		self.tag.remove_year()
	}
	pub fn set_year(&mut self, value: i32) {
		let u = if value < 0 { 0 } else { value as u32 };
		self.tag.set_year(u);
	}
	/// For some tag types, `total` cannot exist without `number`. In those
	/// cases, `total` is assumed to be `None`.
	pub fn set_track_info(
		&mut self,
		number: Option<u32>,
		total: Option<u32>,
	) -> Result<(), SetInfoError> {
		match number {
			Some(number) => self.tag.set_track(number),
			None => self.tag.remove_track(),
		}
		match total {
			Some(total) => self.tag.set_track_total(total),
			None => self.tag.remove_track_total(),
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
		match number {
			Some(number) => self.tag.set_disk(number),
			None => self.tag.remove_disk(),
		}
		match total {
			Some(total) => self.tag.set_disk_total(total),
			None => self.tag.remove_disk_total(),
		}

		Ok(())
	}
	pub fn remove_bpm(&mut self) {
		self.tag.remove_key(&ItemKey::Bpm);
	}
	pub fn set_bpm(&mut self, value: u16) {
		let mut inserted = self.tag.insert_text(ItemKey::Bpm, value.to_string());
		if !inserted {
			inserted = self.tag.insert_text(ItemKey::IntegerBpm, value.to_string());
		}
		assert!(inserted, "Failed to set BPM");
	}
	pub fn remove_comments(&mut self) {
		self.tag.remove_comment()
	}
	pub fn set_comment(&mut self, value: &str) {
		self.tag.set_comment(value.to_string())
	}
	pub fn set_image(&mut self, index: usize, data: Vec<u8>) -> UniResult<()> {
		let mut reader = Cursor::new(data);
		let picture = match lofty::picture::Picture::from_reader(&mut reader) {
			Ok(picture) => picture,
			Err(e) => throw!("Unable to read picture: {}", e),
		};
		match picture.mime_type() {
			Some(lofty::picture::MimeType::Png | lofty::picture::MimeType::Jpeg) => {
				self.tag.set_picture(index, picture);
			}
			_ => throw!("Unsupported picture type"),
		}

		Ok(())
	}
	pub fn get_image_ref(&self, index: usize) -> UniResult<Option<ImageRef>> {
		let pictures = self.tag.pictures();
		match pictures.get(index) {
			Some(pic) => {
				let data = pic.data();
				Ok(Some(ImageRef {
					index: index.try_into().expect("usize conv"),
					total_images: pictures.len().try_into().expect("usize conv"),
					data,
					mime_type: match pic.mime_type() {
						Some(mime_type) => mime_type.clone(),
						_ => throw!("No mime type"),
					},
				}))
			}
			None => Ok(None),
		}
	}
	pub fn get_image_consume(mut self, index: usize) -> UniResult<Option<Image>> {
		if self.tag.picture_count() <= index.try_into().expect("usize conv") {
			return Ok(None);
		}
		let pic = self.tag.remove_picture(index);
		Ok(Some(Image {
			data: pic.into_data(),
		}))
	}
	pub fn remove_image(&mut self, index: usize) -> Picture {
		self.tag.remove_picture(index)
	}
}
