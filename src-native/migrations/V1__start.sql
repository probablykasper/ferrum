create table tracks (
	id                INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	text_id           TEXT UNIQUE NOT NULL,
	added_at          INTEGER NOT NULL, -- i64 ms since unix epoch
	album_artist      TEXT NULL,
	album_title       TEXT NULL,
	artist            TEXT NOT NULL,
	bitrate           REAL NOT NULL, -- f64
	bpm               REAL NULL, -- f64
	comments          TEXT NULL,
	compilation       BOOLEAN NULL,
	composer          TEXT NULL,
	disabled          BOOLEAN NULL,
	disc_count        INTEGER NULL, -- u32
	disc_num          INTEGER NULL, -- u32
	disliked          BOOLEAN NULL,
	duration_s        REAL NOT NULL, -- f64
	file              TEXT NOT NULL,
	filesize          INTEGER NOT NULL, -- i64
	genre             TEXT NULL,
	grouping          TEXT NULL,
	imported_at       INTEGER NULL, -- i64 ms since unix epoch
	imported_from     TEXT NULL,
	liked             BOOLEAN NULL,
	modified_at       INTEGER NOT NULL, -- i64 ms since unix epoch
	original_id       TEXT NULL, -- Imported ID, like iTunes Persistent ID
	play_count        INTEGER NOT NULL, -- u32
	rating_pct        INTEGER NULL, -- from 0 to 100
	sample_rate       REAL NOT NULL, -- f64
	skip_count        INTEGER NOT NULL, -- u32
	sort_album_artist TEXT NULL,
	sort_album_title  TEXT NULL,
	sort_artist       TEXT NULL,
	sort_composer     TEXT NULL,
	sort_title        TEXT NULL,
	title             TEXT NOT NULL,
	track_count       INTEGER NULL, -- u32
	track_num         INTEGER NULL, -- u32
	volume            INTEGER NULL, -- from -100 to 100
	year              INTEGER NULL -- i64
);

CREATE TABLE track_updates (
	revision_n INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	id   INTEGER NOT NULL,
	is_delete  BOOLEAN NOT NULL
);

CREATE TRIGGER tracks_after_insert AFTER INSERT ON tracks BEGIN
	INSERT INTO track_updates (id, is_delete) VALUES (NEW.id, false);
END;

CREATE TRIGGER tracks_after_update AFTER UPDATE ON tracks BEGIN
	INSERT INTO track_updates (id, is_delete) VALUES (NEW.id, false);
END;

CREATE TRIGGER tracks_after_delete AFTER DELETE ON tracks BEGIN
	INSERT INTO track_updates (id, is_delete) VALUES (OLD.id, true);
END;

CREATE TABLE plays (
	date          INTEGER NOT NULL,
	track_id      INTEGER NOT NULL REFERENCES tracks(id),
	-- iTunes imports had non-unique play timestamps for some tracks, so we allow
	-- non-unique timestamps. iTunes plays are in plays_imported, except the most recent play.
	PRIMARY KEY (date, track_id)
);

CREATE TABLE plays_imported (
	date_range_from INTEGER NOT NULL,
	date_range_to   INTEGER NOT NULL,
	count           INTEGER NOT NULL,
	track_id        INTEGER NOT NULL REFERENCES tracks(id),
	PRIMARY KEY (date_range_from, track_id)
);

CREATE TABLE skips (
	date          INTEGER NOT NULL,
	track_id      INTEGER NOT NULL REFERENCES tracks(id),
	-- iTunes imports had duplicate play timestamps for some tracks, so we allow
	-- duplicate timestamps. iTunes plays are in plays_imported, except the most recent play.
	PRIMARY KEY (date, track_id)
);

CREATE TABLE skips_imported (
	date_range_from INTEGER NOT NULL,
	date_range_to   INTEGER NOT NULL,
	count           INTEGER NOT NULL,
	track_id        INTEGER NOT NULL REFERENCES tracks(id),
	PRIMARY KEY (date_range_from, track_id)
);

CREATE TABLE track_lists (
	id            TEXT PRIMARY KEY NOT NULL,
	kind          TEXT NOT NULL CHECK (kind IN ('playlist', 'folder', 'special')),
	parent_id     TEXT NULL REFERENCES track_lists(id),
	item_pos      INTEGER NULL,
	name          TEXT NOT NULL,
	description   TEXT NOT NULL,
	liked         BOOLEAN NOT NULL DEFAULT 0,
	disliked      BOOLEAN NOT NULL DEFAULT 0,
	imported_from TEXT NULL, -- For example "itunes"
	original_id   TEXT NULL, -- For example iTunes Persistent ID
	imported_at   INTEGER NULL,
	created_at    INTEGER NULL -- Nullable for imported playlists
);

CREATE TABLE playlist_tracks (
	track_list_id TEXT NOT NULL REFERENCES track_lists(id),
	track_id      INTEGER NOT NULL REFERENCES tracks(id),
	item_id       INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	item_pos      INTEGER NOT NULL
);

CREATE TABLE play_times (
	started_at INTEGER PRIMARY KEY NOT NULL,
	duration   INTEGER NOT NULL,
	track_id   INTEGER NOT NULL REFERENCES tracks(id)
);
