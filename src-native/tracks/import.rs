use crate::data::Data;
use crate::library_types::Track;
use crate::tracks::generate_filename;
use crate::{sys_time_to_timestamp, UniResult};
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::tag::{Accessor, ItemKey, TagExt};
use std::fs;
use std::path::Path;

#[derive(PartialEq)]
pub enum FileType {
	Mp3,
	M4a,
	Opus,
}
impl FileType {
	pub fn from_path(path: &Path) -> UniResult<Self> {
		let ext = path.extension().unwrap_or_default().to_string_lossy();
		match ext.as_ref() {
			"mp3" => Ok(FileType::Mp3),
			"m4a" => Ok(FileType::M4a),
			"opus" => Ok(FileType::Opus),
			_ => throw!("Unsupported file extension {}", ext),
		}
	}
	pub fn from_lofty_file_type(lofty_type: lofty::file::FileType) -> UniResult<Self> {
		match lofty_type {
			lofty::file::FileType::Mpeg => Ok(FileType::Mp3),
			lofty::file::FileType::Mp4 => Ok(FileType::M4a),
			lofty::file::FileType::Opus => Ok(FileType::Opus),
			_ => throw!("Unsupported file type {:?}", lofty_type),
		}
	}
	pub fn file_extension(&self) -> &'static str {
		match self {
			FileType::Mp3 => "mp3",
			FileType::M4a => "m4a",
			FileType::Opus => "opus",
		}
	}
}
impl std::fmt::Display for FileType {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		write!(f, "{}", self.file_extension())
	}
}

pub fn read_file_metadata(path: &Path) -> UniResult<fs::Metadata> {
	match std::fs::metadata(path) {
		Ok(file_md) => Ok(file_md),
		Err(err) => match err.kind() {
			std::io::ErrorKind::NotFound => throw!("File does not exist"),
			_ => throw!("Unable to access file: {}", err),
		},
	}
}

pub fn import(data: &Data, track_path: &Path, now: i64) -> UniResult<Track> {
	let file_md = read_file_metadata(track_path)?;

	let mut date_modified = match file_md.modified() {
		Ok(sys_time) => sys_time_to_timestamp(&sys_time),
		Err(_) => now,
	};

	let probe = match lofty::probe::Probe::open(track_path) {
		Ok(f) => {
			let parse_options = lofty::config::ParseOptions::new()
				.read_properties(true)
				.parsing_mode(lofty::config::ParsingMode::Strict);
			f.options(parse_options)
		}
		Err(e) => throw!("File does not exist: {}", e),
	};
	let mut tagged_file = match probe.read() {
		Ok(f) => f,
		Err(e) => throw!("Unable to read file: {}", e),
	};
	let properties = tagged_file.properties().clone();

	let mut tag_changed = false;
	let mut default_tag = lofty::tag::Tag::new(tagged_file.primary_tag_type());
	let tag = match tagged_file.primary_tag_mut() {
		Some(tag) => tag,
		None => &mut default_tag,
	};

	let title = match tag.title() {
		Some(title) => title.into_owned(),
		None => {
			let file_stem = match track_path.file_stem() {
				Some(stem) => stem.to_string_lossy().into_owned(),
				None => "".to_string(),
			};
			tag.set_title(file_stem.clone());
			tag_changed = true;
			file_stem
		}
	};
	let artist = tag.artist().map(|s| s.into_owned()).unwrap_or_default();

	let tracks_dir = &data.paths.tracks_dir;
	let extension = match FileType::from_path(track_path)? {
		FileType::Opus => "opus",
		FileType::M4a => "m4a",
		FileType::Mp3 => "mp3",
	};
	let filename = generate_filename(tracks_dir, &artist, &title, extension);
	let dest_path = tracks_dir.join(&filename);

	match fs::copy(track_path, &dest_path) {
		Ok(_) => (),
		Err(e) => throw!("Error copying file: {e}"),
	};
	println!(
		"{} -> {}",
		track_path.to_string_lossy(),
		dest_path.to_string_lossy()
	);

	if tag_changed {
		println!("Writing:::::::");
		match tag.save_to_path(&dest_path, lofty::config::WriteOptions::default()) {
			Ok(_) => (),
			Err(e) => throw!("Unable to tag file {}: {e}", dest_path.to_string_lossy()),
		};
		// manually set date_modified because the date_modified doens't seem to
		// immediately update after tag.write_to_path().
		date_modified = now;
	}

	let track = Track {
		size: file_md.len().try_into().unwrap(),
		duration: properties.duration().as_secs_f64(),
		bitrate: (properties.audio_bitrate().expect("Missing bitrate") * 1000).into(), // kbps to bps
		sampleRate: properties
			.sample_rate()
			.expect("Missing sample rate")
			.into(),
		file: filename,
		dateModified: date_modified,
		dateAdded: now,
		name: title,
		importedFrom: None,
		originalId: None,
		artist,
		composer: tag.get_string(&ItemKey::Composer).map(|s| s.to_string()),
		sortName: tag
			.get_string(&ItemKey::TrackTitleSortOrder)
			.map(|s| s.to_string()),
		sortArtist: tag
			.get_string(&ItemKey::TrackArtistSortOrder)
			.map(|s| s.to_string()),
		sortComposer: tag
			.get_string(&ItemKey::ComposerSortOrder)
			.map(|s| s.to_string()),
		genre: tag.genre().map(|s| s.into_owned()),
		rating: None,
		year: tag.year().map(|y| y.into()),
		bpm: match tag.get_string(&ItemKey::Bpm) {
			Some(n) => n.parse().ok(),
			None => None,
		},
		comments: tag.comment().map(|s| s.into_owned()),
		grouping: tag
			.get_string(&ItemKey::ContentGroup)
			.map(|s| s.to_string())
			.or_else(|| {
				tag.get_string(&ItemKey::AppleId3v2ContentGroup)
					.map(|s| s.to_string())
			}),
		liked: None,
		disliked: None,
		disabled: None,
		compilation: None,
		albumName: tag.album().map(|s| s.to_string()),
		albumArtist: tag.get_string(&ItemKey::AlbumArtist).map(|s| s.to_string()),
		sortAlbumName: tag
			.get_string(&ItemKey::AlbumTitleSortOrder)
			.map(|s| s.to_string()),
		sortAlbumArtist: tag
			.get_string(&ItemKey::AlbumArtistSortOrder)
			.map(|s| s.to_string()),
		trackNum: tag.track(),
		trackCount: tag.track_total(),
		discNum: tag.disk(),
		discCount: tag.disk_total(),
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
