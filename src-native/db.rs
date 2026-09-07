use rusqlite::types::FromSql;

pub type TrackIDNew = i64;
pub type TrackListID = String;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TrackListKind {
	Playlist,
	Folder,
	Special,
}
impl FromSql for TrackListKind {
	fn column_result(value: rusqlite::types::ValueRef<'_>) -> rusqlite::types::FromSqlResult<Self> {
		let kind = match value.as_str()? {
			"playlist" => TrackListKind::Playlist,
			"folder" => TrackListKind::Folder,
			"special" => TrackListKind::Special,
			_ => return Err(rusqlite::types::FromSqlError::InvalidType),
		};
		Ok(kind)
	}
}
impl ToString for TrackListKind {
	fn to_string(&self) -> String {
		match self {
			TrackListKind::Playlist => "playlist".to_string(),
			TrackListKind::Folder => "folder".to_string(),
			TrackListKind::Special => "special".to_string(),
		}
	}
}

pub enum SpecialTrackListId {
	Root,
}
impl SpecialTrackListId {
	pub fn from_id(id: &str) -> Self {
		match id {
			"root" => Self::Root,
			_ => panic!("Unknown special track list id: {}", id),
		}
	}
}

pub enum TrackListVariant {
	Playlist,
	Folder,
	Root,
}
impl TrackListVariant {
	pub fn from_special_track_list_id(id: SpecialTrackListId) -> Self {
		match id {
			SpecialTrackListId::Root => Self::Root,
		}
	}
}

// #[derive(Debug)]
// pub struct TrackList {
// 	id: String,
// 	kind: String,
// 	parent_id: Option<TrackListID>,
// 	item_index: Option<i64>,
// 	name: String,
// 	description: String,
// 	liked: bool,
// 	disliked: bool,
// 	/// For example "itunes"
// 	imported_from: Option<String>,
// 	/// For example iTunes Persistent ID
// 	original_id: Option<String>,
// 	imported_at: Option<i64>,
// 	/// Nullable for imported playlists
// 	created_at: Option<i64>,
// }

// let tracklist: db::TrackList = sqlx::query_as("SELECT * FROM track_lists WHERE id = ?")
// 		.bind(&options.playlist_id)
// 		.fetch_one(&mut data.db)
// 		.await?;
