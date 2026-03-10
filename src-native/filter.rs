use crate::library_types::{ItemId, Library, TRACK_ID_MAP};
use rayon::prelude::*;
use std::str::Chars;
use std::time::Instant;
use unicode_normalization::{Recompositions, UnicodeNormalization};

fn match_at_start(mut text: Recompositions<Chars>, keyword: Chars) -> bool {
	for keyword_char in keyword {
		let text_char = match text.next() {
			Some(x) => x,
			None => return false,
		};
		match check(keyword_char, text_char) {
			Eq::True => {}
			Eq::False => return false,
			Eq::Skip => {
				// skip only once. would it be useful to skip multiple times?
				let new_text_char = match text.next() {
					Some(x) => x,
					None => return false,
				};
				match check(keyword_char, new_text_char) {
					Eq::True => {}
					Eq::False => return false,
					Eq::Skip => return false,
				}
			}
		}
	}
	return true;
}

fn find_match(text: &str, keyword: &str) -> bool {
	let mut keyword_chars = keyword.chars();
	let first_keyword_char = match keyword_chars.next() {
		Some(x) => x,
		None => return true, // match if keyword is empty string
	};
	let mut text_chars = text.nfc();
	while let Some(text_char) = text_chars.next() {
		match check(first_keyword_char, text_char) {
			Eq::True => {
				if match_at_start(text_chars.clone(), keyword_chars.clone()) {
					return true;
				}
			}
			_ => {}
		}
	}
	return false;
}

fn find_match_opt(text: &Option<String>, keyword: &str) -> bool {
	match text {
		Some(text) => find_match(text, keyword),
		None => return false,
	}
}

fn strip_prefix_ignore_case<'a>(text: &'a str, prefix: &str) -> Option<&'a str> {
	if text.len() >= prefix.len() && text.get(..prefix.len())?.eq_ignore_ascii_case(prefix) {
		Some(&text[prefix.len()..])
	} else {
		None
	}
}

fn strip_suffix_ignore_case<'a>(text: &'a str, suffix: &str) -> Option<&'a str> {
	if text.len() >= suffix.len()
		&& text
			.get(text.len() - suffix.len()..)?
			.eq_ignore_ascii_case(suffix)
	{
		Some(&text[..text.len() - suffix.len()])
	} else {
		None
	}
}

fn feat_artists_match(track_name: &str, keyword: &str) -> bool {
	for (open, close) in &[('(', ')'), ('[', ']')] {
		let mut rest = track_name;
		while let Some(start) = rest.find(*open) {
			if let Some(end) = rest[start..].find(*close) {
				let inside = &rest[start + 1..start + end];
				for prefix in ["feat.", "feat ", "ft.", "ft ", "featuring "] {
					let artist_text = strip_prefix_ignore_case(inside, prefix);
					if let Some(artist_text) = artist_text {
						return find_match(artist_text, keyword);
					}
				}
				for prefix in [" remix", " flip", " bootleg", " edit"] {
					let artist_text = strip_suffix_ignore_case(inside, prefix);
					if let Some(artist_text) = artist_text {
						return find_match(artist_text, keyword);
					}
				}
				rest = &rest[start + end + 1..];
			} else {
				break;
			}
		}
	}
	false
}

fn filter_keyword(ids: Vec<ItemId>, keyword: Keyword, library: &Library) -> Vec<ItemId> {
	let id_map = TRACK_ID_MAP.read().unwrap();
	let filtered_tracks: Vec<_> = ids
		.into_par_iter()
		.with_min_len(2000)
		.filter(|item_id| {
			let track_id = &id_map[*item_id as usize];
			let track = match library.get_track(track_id) {
				Ok(track) => track,
				Err(_) => panic!("Track ID {} not found", track_id),
			};
			let field = match &keyword.field {
				Some(field) => field.to_lowercase(),
				None => "".to_string(),
			};
			let is_match = match field.as_str() {
				"name" | "title" => find_match(&track.name, &keyword.literal),
				"artist" | "band" => {
					find_match(&track.artist, &keyword.literal)
						|| feat_artists_match(&track.name, &keyword.literal)
				}
				"album" | "albumname" | "album_name" => {
					find_match_opt(&track.albumName, &keyword.literal)
				}
				"albumartist" | "album_artist" => {
					find_match_opt(&track.albumArtist, &keyword.literal)
				}
				"comment" | "comments" | "description" | "notes" => {
					find_match_opt(&track.comments, &keyword.literal)
				}
				"genre" => find_match_opt(&track.genre, &keyword.literal),
				"composer" => find_match_opt(&track.composer, &keyword.literal),
				"group" | "grouping" => find_match_opt(&track.grouping, &keyword.literal),
				"year" => {
					track.year.map(|n| n.to_string()).unwrap_or("".to_string()) == keyword.literal
				}
				"plays" => {
					track
						.plays
						.as_ref()
						.map(|n| n.len().to_string())
						.unwrap_or("".to_string())
						== keyword.literal
				}
				"skips" => {
					track
						.skips
						.as_ref()
						.map(|n| n.len().to_string())
						.unwrap_or("".to_string())
						== keyword.literal
				}
				"bpm" => {
					track.bpm.map(|n| n.to_string()).unwrap_or("".to_string()) == keyword.literal
				}
				_ => {
					find_match(&track.name, &keyword.full_word)
						|| find_match(&track.artist, &keyword.full_word)
						|| find_match_opt(&track.albumName, &keyword.full_word)
						|| find_match_opt(&track.comments, &keyword.full_word)
						|| find_match_opt(&track.genre, &keyword.full_word)
				}
			};
			is_match
		})
		.map(|id| id.clone())
		.collect();
	filtered_tracks
}

#[derive(Default, Debug)]
struct Keyword {
	full_word: String,
	field: Option<String>,
	literal: String,
}
impl Keyword {
	fn from_word(word: &str) -> Keyword {
		let mut parts = word.splitn(2, ':');
		let field = parts.next();
		let literal = parts.next();
		match (field, literal) {
			(Some(field), Some(literal)) => Keyword {
				full_word: word.to_string(),
				field: Some(field.to_string()),
				literal: literal.to_string(),
			},
			_ => Keyword {
				full_word: word.to_string(),
				field: None,
				literal: word.to_string(),
			},
		}
	}
	fn parse_next_keyword(query: &mut String) -> Option<Keyword> {
		*query = query.trim_start().to_string();
		if query.is_empty() {
			return None;
		}

		// get next word
		let (word, rest) = match query.find(char::is_whitespace) {
			Some(i) => {
				let (word, rest) = query.split_at(i);
				(word.to_string(), rest.to_string())
			}
			None => (query.to_string(), "".to_string()),
		};
		*query = rest.to_string();
		println!("word: {}", word);
		println!("rest: {}", query);

		let mut keyword = Keyword::from_word(&word);

		// parse field:"literal"
		if keyword.field.is_some() && keyword.literal.starts_with('\"') {
			keyword.literal = keyword.literal[1..].to_string();
			// Search for the next quote in the current keyword
			match keyword.literal.split_once('\"') {
				Some((literal, rest)) => {
					let (literal, rest) = (literal.to_string(), rest.to_string());
					keyword.literal = literal;
					*query = rest + " " + query;
				}
				None => {}
			};
			// Search for the next quote in the rest of the query
			let (literal, rest) = match query.split_once('\"') {
				Some((literal, rest)) => (literal.to_string(), rest.to_string()),
				// If there is no ending quote, treat everything as quoted
				None => (query.to_string(), "".to_string()),
			};
			keyword.literal.push_str(&literal);
			*query = rest;
			println!("word: {}", keyword.literal);
			println!("rest: {}", query);
		}

		Some(keyword)
	}
}

pub fn filter(mut item_ids: Vec<ItemId>, query: String, library: &Library) -> Vec<ItemId> {
	let now = Instant::now();
	if query == "" {
		return item_ids;
	}
	let mut query: String = query.to_lowercase().nfc().collect();

	let mut keywords = Vec::new();
	while let Some(keyword) = Keyword::parse_next_keyword(&mut query) {
		keywords.push(keyword);
	}

	println!("Keywords: {keywords:?}");

	for keyword in keywords {
		item_ids = filter_keyword(item_ids, keyword, &library);
	}
	println!("Filter: {}ms", now.elapsed().as_millis());
	item_ids
}

enum Eq {
	True,
	False,
	Skip,
}
fn check(user_char: char, data_char: char) -> Eq {
	if user_char == data_char {
		return Eq::True;
	}
	// unicode list: https://en.wikipedia.org/wiki/List_of_Unicode_characters
	// double char matches todo: æ ae, ß ss, œ oe
	let is_skip = match data_char {
		// ascii symbols, \u{0021} to \u{002F}
		'!' | '"' | '#' | '$' | '%' | '&' | '\'' | '(' | ')' => true,
		'*' | '+' | ',' | '-' | '.' | '/' => true,
		// ascii symbols, \u{003A} to \u{0040}
		':' | ';' | '<' | '=' | '>' | '?' | '@' => true,
		// ascii symbols, \u{005B} to \u{0060}
		'[' | '\\' | ']' | '^' | '_' | '`' => true,
		// ascii symbols, \u{007B} to \u{007E}
		'{' | '|' | '}' | '~' => true,

		// latin-1 puncutation/symbols, \u{00A1} to \u{00BF}
		'¡' | '¢' | '£' | '¤' | '¥' | '¦' | '§' | '¨' | '©' | 'ª' | '«' | '¬' => true,
		'\u{00AD}' | '®' | '¯' | '°' | '±' | '²' | '³' | '´' | 'µ' | '¶' | '·' => true,
		'¸' | '¹' | 'º' | '»' | '¼' | '½' | '¾' | '¿' => true,

		// math, \u{00D7} and \u{00F7}
		'×' | '÷' => true,

		// unicode symbols \u{2012} to \u{204A}
		'–' | '—' | '―' | '‗' | '‘' | '’' | '‚' | '‛' | '“' | '”' | '„' | '†' | '‡' | '•' | '…'
		| '‰' | '′' | '″' | '‹' | '›' | '‼' | '‾' | '⁄' | '⁊' => true,

		// fullwidth ascii symbols, \u{FF01} to \u{FF0F}
		'！' | '＂' | '＃' | '＄' | '％' | '＆' | '＇' => true,
		'（' | '）' | '＊' | '＋' | '，' | '－' | '．' | '／' => true,
		// fullwidth ascii symbols, \u{FF1A} to \u{FF20}
		'：' | '；' | '＜' | '＝' | '＞' | '？' | '＠' => true,
		// fullwidth ascii symbols, \u{FF3B} to \u{FF40}
		'［' | '＼' | '］' | '＾' | '＿' | '｀' => true,
		// fullwidth ascii symbols, \u{FF5B} to \u{FF5E}
		'｛' | '｜' | '｝' | '～' => true,
		// fullwidth double brackets, \u{FF5F} and \u{FF60}
		'｟' | '｠' => true,

		// figure dash
		'‒' => true,

		// other currencies
		'֏' | '؋' | '৲' | '৳' | '৻' | '૱' | '௹' | '฿' | '៛' | '₠' | '₡' | '₢' | '₣' | '₤' | '₥'
		| '₦' | '₧' | '₨' | '₩' | '₪' | '₫' | '€' | '₭' | '₮' | '₯' | '₰' | '₱' | '₲' | '₳'
		| '₴' | '₵' | '₶' | '₷' | '₸' | '₹' | '₺' | '₻' | '₼' | '₽' | '₾' | '₿' | '﹩' | '￠'
		| '￡' | '￥' | '￦' => true,

		_ => false,
	};
	if is_skip {
		return Eq::Skip;
	}
	fn one_of(c: &char, a: char, b: char) -> bool {
		return c == &a || c == &b;
	}
	let is_match = match user_char {
		// dash
		'–' | '—' | '―' => match data_char {
			'–' | '—' | '―' | '-' => true,
			_ => false,
		},
		// Basic Latin, Latin-1 Supplement, Latin Extended-A
		'A' | 'a' => match data_char {
			'A' | 'a' | 'Ａ' | 'ａ' | 'À' | 'à' | 'Á' | 'á' | 'Â' | 'â' | 'Ã' | 'ã' => {
				true
			}
			'Ä' | 'ä' | 'Å' | 'å' | 'Ā' | 'ā' | 'Ă' | 'ă' | 'Ą' | 'ą' => true,
			_ => false,
		},
		'Ａ' | 'ａ' => one_of(&data_char, 'Ａ', 'ａ'),
		'À' | 'à' => one_of(&data_char, 'À', 'à'),
		'Á' | 'á' => one_of(&data_char, 'Á', 'á'),
		'Â' | 'â' => one_of(&data_char, 'Â', 'â'),
		'Ã' | 'ã' => one_of(&data_char, 'Ã', 'ã'),
		'Ä' | 'ä' => one_of(&data_char, 'Ä', 'ä'),
		'Å' | 'å' => one_of(&data_char, 'Å', 'å'),
		'Ā' | 'ā' => one_of(&data_char, 'Ā', 'ā'),
		'Ă' | 'ă' => one_of(&data_char, 'Ă', 'ă'),
		'Ą' | 'ą' => one_of(&data_char, 'Ą', 'ą'),

		'B' | 'b' => match data_char {
			'B' | 'b' | 'Ｂ' | 'ｂ' => true,
			_ => false,
		},
		'Ｂ' | 'ｂ' => one_of(&data_char, 'Ｂ', 'ｂ'),

		'C' | 'c' => match data_char {
			'C' | 'c' | 'Ｃ' | 'ｃ' | 'Ç' | 'ç' | 'Ć' | 'ć' | 'Ĉ' | 'ĉ' | 'Ċ' | 'ċ' | 'Č' | 'č' => {
				true
			}
			_ => false,
		},
		'Ｃ' | 'ｃ' => one_of(&data_char, 'Ｃ', 'ｃ'),
		'Ç' | 'ç' => one_of(&data_char, 'Ç', 'ç'),
		'Ć' | 'ć' => one_of(&data_char, 'Ć', 'ć'),
		'Ĉ' | 'ĉ' => one_of(&data_char, 'Ĉ', 'ĉ'),
		'Ċ' | 'ċ' => one_of(&data_char, 'Ċ', 'ċ'),
		'Č' | 'č' => one_of(&data_char, 'Č', 'č'),

		'D' | 'd' => match data_char {
			'D' | 'd' | 'Ｄ' | 'ｄ' | 'Ð' | 'ð' | 'Ď' | 'ď' | 'Đ' | 'đ' => true,
			_ => false,
		},
		'Ｄ' | 'ｄ' => one_of(&data_char, 'Ｄ', 'ｄ'),
		'Ð' | 'ð' => one_of(&data_char, 'Ð', 'ð'),
		'Ď' | 'ď' => one_of(&data_char, 'Ď', 'ď'),
		'Đ' | 'đ' => one_of(&data_char, 'Đ', 'đ'),

		'E' | 'e' => match data_char {
			'E' | 'e' | 'Ｅ' | 'ｅ' | 'È' | 'è' | 'É' | 'é' | 'Ê' | 'ê' | 'Ë' | 'ë' => {
				true
			}
			'Ē' | 'ē' | 'Ĕ' | 'ĕ' | 'Ė' | 'ė' | 'Ę' | 'ę' | 'Ě' | 'ě' => true,
			_ => false,
		},
		'Ｅ' | 'ｅ' => one_of(&data_char, 'Ｅ', 'ｅ'),
		'È' | 'è' => one_of(&data_char, 'È', 'è'),
		'É' | 'é' => one_of(&data_char, 'É', 'é'),
		'Ê' | 'ê' => one_of(&data_char, 'Ê', 'ê'),
		'Ë' | 'ë' => one_of(&data_char, 'Ë', 'ë'),
		'Ē' | 'ē' => one_of(&data_char, 'Ē', 'ē'),
		'Ĕ' | 'ĕ' => one_of(&data_char, 'Ĕ', 'ĕ'),
		'Ė' | 'ė' => one_of(&data_char, 'Ė', 'ė'),
		'Ę' | 'ę' => one_of(&data_char, 'Ę', 'ę'),
		'Ě' | 'ě' => one_of(&data_char, 'Ě', 'ě'),

		'F' | 'f' => match data_char {
			'F' | 'f' | 'Ｆ' | 'ｆ' => true,
			_ => false,
		},
		'Ｆ' | 'ｆ' => one_of(&data_char, 'Ｆ', 'ｆ'),

		'G' | 'g' => match data_char {
			'G' | 'g' | 'Ｇ' | 'ｇ' | 'Ĝ' | 'ĝ' | 'Ğ' | 'ğ' | 'Ġ' | 'ġ' | 'Ģ' | 'ģ' => {
				true
			}
			_ => false,
		},
		'Ｇ' | 'ｇ' => one_of(&data_char, 'Ｇ', 'ｇ'),
		'Ĝ' | 'ĝ' => one_of(&data_char, 'Ĝ', 'ĝ'),
		'Ğ' | 'ğ' => one_of(&data_char, 'Ğ', 'ğ'),
		'Ġ' | 'ġ' => one_of(&data_char, 'Ġ', 'ġ'),
		'Ģ' | 'ģ' => one_of(&data_char, 'Ģ', 'ģ'),

		'H' | 'h' => match data_char {
			'H' | 'h' | 'Ｈ' | 'ｈ' | 'Ĥ' | 'ĥ' | 'Ħ' | 'ħ' => true,
			_ => false,
		},
		'Ｈ' | 'ｈ' => one_of(&data_char, 'Ｈ', 'ｈ'),
		'Ĥ' | 'ĥ' => one_of(&data_char, 'Ĥ', 'ĥ'),
		'Ħ' | 'ħ' => one_of(&data_char, 'Ħ', 'ħ'),

		'I' | 'i' => match data_char {
			'I' | 'i' | 'Ｉ' | 'ｉ' | 'Ì' | 'ì' | 'Í' | 'í' | 'Î' | 'î' | 'Ï' | 'ï' => {
				true
			}
			'Ĩ' | 'ĩ' | 'Ī' | 'ī' | 'Ĭ' | 'ĭ' | 'Į' | 'į' => true,
			'İ' | 'ı' => true, // dotted I and dotless i
			_ => false,
		},
		'Ｉ' | 'ｉ' => one_of(&data_char, 'Ｉ', 'ｉ'),
		'Ĩ' | 'ĩ' => one_of(&data_char, 'Ĩ', 'ĩ'),
		'Ī' | 'ī' => one_of(&data_char, 'Ī', 'ī'),
		'Ĭ' | 'ĭ' => one_of(&data_char, 'Ĭ', 'ĭ'),
		'Į' | 'į' => one_of(&data_char, 'Į', 'į'),

		'J' | 'j' => match data_char {
			'J' | 'j' | 'Ｊ' | 'ｊ' | 'Ĵ' | 'ĵ' => true,
			_ => false,
		},
		'Ｊ' | 'ｊ' => one_of(&data_char, 'Ｊ', 'ｊ'),
		'Ĵ' | 'ĵ' => one_of(&data_char, 'Ĵ', 'ĵ'),

		'K' | 'k' => match data_char {
			'K' | 'k' | 'Ｋ' | 'ｋ' | 'Ķ' | 'ķ' => true,
			'ĸ' => true, // only lowercase
			_ => false,
		},
		'Ｋ' | 'ｋ' => one_of(&data_char, 'Ｋ', 'ｋ'),
		'Ķ' | 'ķ' => one_of(&data_char, 'Ķ', 'ķ'),

		'L' | 'l' => match data_char {
			'L' | 'l' | 'Ｌ' | 'ｌ' | 'Ĺ' | 'ĺ' => true,
			'Ļ' | 'ļ' | 'Ľ' | 'ľ' | 'Ŀ' | 'ŀ' | 'Ł' | 'ł' => true,
			_ => false,
		},
		'Ｌ' | 'ｌ' => one_of(&data_char, 'Ｌ', 'ｌ'),
		'Ĺ' | 'ĺ' => one_of(&data_char, 'Ĺ', 'ĺ'),
		'Ļ' | 'ļ' => one_of(&data_char, 'Ļ', 'ļ'),
		'Ľ' | 'ľ' => one_of(&data_char, 'Ľ', 'ľ'),
		'Ŀ' | 'ŀ' => one_of(&data_char, 'Ŀ', 'ŀ'),
		'Ł' | 'ł' => one_of(&data_char, 'Ł', 'ł'),

		'M' | 'm' => match data_char {
			'M' | 'm' | 'Ｍ' | 'ｍ' => true,
			_ => false,
		},
		'Ｍ' | 'ｍ' => one_of(&data_char, 'Ｍ', 'ｍ'),

		'N' | 'n' => match data_char {
			'N' | 'n' | 'Ｎ' | 'ｎ' | 'Ñ' | 'ñ' | 'Ń' | 'ń' | 'Ņ' | 'ņ' | 'Ň' | 'ň' => {
				true
			}
			'ŉ' => true, // only lowercase, deprecated
			_ => false,
		},
		'Ｎ' | 'ｎ' => one_of(&data_char, 'Ｎ', 'ｎ'),
		'Ñ' | 'ñ' => one_of(&data_char, 'Ñ', 'ñ'),
		'Ń' | 'ń' => one_of(&data_char, 'Ń', 'ń'),
		'Ņ' | 'ņ' => one_of(&data_char, 'Ņ', 'ņ'),
		'Ň' | 'ň' => one_of(&data_char, 'Ň', 'ň'),

		'O' | 'o' => match data_char {
			'O' | 'o' | 'Ｏ' | 'ｏ' | 'Ò' | 'ò' | 'Ó' | 'ó' | 'Ô' | 'ô' | 'Õ' | 'õ' => {
				true
			}
			'Ö' | 'ö' | 'Ø' | 'ø' | 'Ō' | 'ō' | 'Ŏ' | 'ŏ' | 'Ő' | 'ő' => true,
			_ => false,
		},
		'Ｏ' | 'ｏ' => one_of(&data_char, 'Ｏ', 'ｏ'),
		'Ò' | 'ò' => one_of(&data_char, 'Ò', 'ò'),
		'Ó' | 'ó' => one_of(&data_char, 'Ó', 'ó'),
		'Ô' | 'ô' => one_of(&data_char, 'Ô', 'ô'),
		'Õ' | 'õ' => one_of(&data_char, 'Õ', 'õ'),
		'Ö' | 'ö' => one_of(&data_char, 'Ö', 'ö'),
		'Ø' | 'ø' => one_of(&data_char, 'Ø', 'ø'),
		'Ō' | 'ō' => one_of(&data_char, 'Ō', 'ō'),
		'Ŏ' | 'ŏ' => one_of(&data_char, 'Ŏ', 'ŏ'),
		'Ő' | 'ő' => one_of(&data_char, 'Ő', 'ő'),

		'P' | 'p' => match data_char {
			'P' | 'p' | 'Ｐ' | 'ｐ' => true,
			_ => false,
		},
		'Ｐ' | 'ｐ' => one_of(&data_char, 'Ｐ', 'ｐ'),

		'Q' | 'q' => match data_char {
			'Q' | 'q' | 'Ｑ' | 'ｑ' => true,
			_ => false,
		},
		'Ｑ' | 'ｑ' => one_of(&data_char, 'Ｑ', 'ｑ'),

		'R' | 'r' => match data_char {
			'R' | 'r' | 'Ｒ' | 'ｒ' | 'Ŕ' | 'ŕ' | 'Ŗ' | 'ŗ' | 'Ř' | 'ř' => true,
			_ => false,
		},
		'Ｒ' | 'ｒ' => one_of(&data_char, 'Ｒ', 'ｒ'),
		'Ŕ' | 'ŕ' => one_of(&data_char, 'Ŕ', 'ŕ'),
		'Ŗ' | 'ŗ' => one_of(&data_char, 'Ŗ', 'ŗ'),
		'Ř' | 'ř' => one_of(&data_char, 'Ř', 'ř'),

		'S' | 's' => match data_char {
			'S' | 's' | 'Ｓ' | 'ｓ' | 'Ś' | 'ś' | 'Ŝ' | 'ŝ' | 'Ş' | 'ş' | 'Š' | 'š' => {
				true
			}
			'ſ' => true, // only lowercase
			_ => false,
		},
		'Ｓ' | 'ｓ' => one_of(&data_char, 'Ｓ', 'ｓ'),
		'Ś' | 'ś' => one_of(&data_char, 'Ś', 'ś'),
		'Ŝ' | 'ŝ' => one_of(&data_char, 'Ŝ', 'ŝ'),
		'Ş' | 'ş' => one_of(&data_char, 'Ş', 'ş'),
		'Š' | 'š' => one_of(&data_char, 'Š', 'š'),

		'T' | 't' => match data_char {
			'T' | 't' | 'Ｔ' | 'ｔ' | 'Ţ' | 'ţ' | 'Ť' | 'ť' | 'Ŧ' | 'ŧ' => true,
			_ => false,
		},
		'Ｔ' | 'ｔ' => one_of(&data_char, 'Ｔ', 'ｔ'),
		'Ţ' | 'ţ' => one_of(&data_char, 'Ţ', 'ţ'),
		'Ť' | 'ť' => one_of(&data_char, 'Ť', 'ť'),
		'Ŧ' | 'ŧ' => one_of(&data_char, 'Ŧ', 'ŧ'),

		'U' | 'u' => match data_char {
			'U' | 'u' | 'Ｕ' | 'ｕ' | 'Ù' | 'ù' | 'Ú' | 'ú' | 'Û' | 'û' | 'Ü' | 'ü' => {
				true
			}
			'Ũ' | 'ũ' | 'Ū' | 'ū' | 'Ŭ' | 'ŭ' | 'Ů' | 'ů' | 'Ű' | 'ű' | 'Ų' | 'ų' => {
				true
			}
			_ => false,
		},
		'Ｕ' | 'ｕ' => one_of(&data_char, 'Ｕ', 'ｕ'),
		'Ù' | 'ù' => one_of(&data_char, 'Ù', 'ù'),
		'Ú' | 'ú' => one_of(&data_char, 'Ú', 'ú'),
		'Û' | 'û' => one_of(&data_char, 'Û', 'û'),
		'Ü' | 'ü' => one_of(&data_char, 'Ü', 'ü'),
		'Ũ' | 'ũ' => one_of(&data_char, 'Ũ', 'ũ'),
		'Ū' | 'ū' => one_of(&data_char, 'Ū', 'ū'),
		'Ŭ' | 'ŭ' => one_of(&data_char, 'Ŭ', 'ŭ'),
		'Ů' | 'ů' => one_of(&data_char, 'Ů', 'ů'),
		'Ű' | 'ű' => one_of(&data_char, 'Ű', 'ű'),
		'Ų' | 'ų' => one_of(&data_char, 'Ų', 'ų'),

		'V' | 'v' => match data_char {
			'V' | 'v' | 'Ｖ' | 'ｖ' => true,
			_ => false,
		},
		'Ｖ' | 'ｖ' => one_of(&data_char, 'Ｖ', 'ｖ'),

		'W' | 'w' => match data_char {
			'W' | 'w' | 'Ｗ' | 'ｗ' | 'Ŵ' | 'ŵ' => true,
			_ => false,
		},
		'Ｗ' | 'ｗ' => one_of(&data_char, 'Ｗ', 'ｗ'),
		'Ŵ' | 'ŵ' => one_of(&data_char, 'Ŵ', 'ŵ'),

		'X' | 'x' => match data_char {
			'X' | 'x' | 'Ｘ' | 'ｘ' => true,
			_ => false,
		},
		'Ｘ' | 'ｘ' => one_of(&data_char, 'Ｘ', 'ｘ'),
		'Y' | 'y' => match data_char {
			'Y' | 'y' | 'Ｙ' | 'ｙ' | 'Ý' | 'ý' | 'Ÿ' | 'ÿ' | 'Ŷ' | 'ŷ' => true,
			_ => false,
		},
		'Ｙ' | 'ｙ' => one_of(&data_char, 'Ｙ', 'ｙ'),
		'Ý' | 'ý' => one_of(&data_char, 'Ý', 'ý'),
		'Ÿ' | 'ÿ' => one_of(&data_char, 'Ÿ', 'ÿ'),
		'Ŷ' | 'ŷ' => one_of(&data_char, 'Ŷ', 'ŷ'),

		'Z' | 'z' => match data_char {
			'Z' | 'z' | 'Ｚ' | 'ｚ' | 'Ź' | 'ź' | 'Ż' | 'ż' | 'Ž' | 'ž' => true,
			_ => false,
		},
		'Ｚ' | 'ｚ' => one_of(&data_char, 'Ｚ', 'ｚ'),
		'Ź' | 'ź' => one_of(&data_char, 'Ź', 'ź'),
		'Ż' | 'ż' => one_of(&data_char, 'Ż', 'ż'),
		'Ž' | 'ž' => one_of(&data_char, 'Ž', 'ž'),

		'Æ' | 'æ' => one_of(&data_char, 'Æ', 'æ'),
		'Þ' | 'þ' => one_of(&data_char, 'Þ', 'þ'),
		'ẞ' | 'ß' => one_of(&data_char, 'ẞ', 'ß'),
		'Ĳ' | 'ĳ' => one_of(&data_char, 'Ĳ', 'ĳ'),
		'Ŋ' | 'ŋ' => one_of(&data_char, 'Ŋ', 'ŋ'),
		'Œ' | 'œ' => one_of(&data_char, 'Œ', 'œ'),

		// fullwidth characters, \u{FF01} to \u{FF20}
		'!' => data_char == '！',
		'"' => data_char == '＂',
		'#' => data_char == '＃',
		'$' => data_char == '＄',
		'%' => data_char == '％',
		'&' => data_char == '＆',
		'\'' => data_char == '＇',
		'(' => data_char == '（',
		')' => data_char == '）',
		'*' => data_char == '＊',
		'+' => data_char == '＋',
		',' => data_char == '，',
		'-' => data_char == '－',
		'.' => data_char == '．',
		'/' => data_char == '／',
		'0' => data_char == '０',
		'1' => data_char == '１',
		'2' => data_char == '２',
		'3' => data_char == '３',
		'4' => data_char == '４',
		'5' => data_char == '５',
		'6' => data_char == '６',
		'7' => data_char == '７',
		'8' => data_char == '８',
		'9' => data_char == '９',
		':' => data_char == '：',
		';' => data_char == '；',
		'<' => data_char == '＜',
		'=' => data_char == '＝',
		'>' => data_char == '＞',
		'?' => data_char == '？',
		'@' => data_char == '＠',

		// cyrillic
		// - only case-insensitive matching (é won't match e)
		'Ѐ' | 'ѐ' => one_of(&data_char, 'Ѐ', 'ѐ'),
		'Ё' | 'ё' => one_of(&data_char, 'Ё', 'ё'),
		'Ђ' | 'ђ' => one_of(&data_char, 'Ђ', 'ђ'),
		'Ѓ' | 'ѓ' => one_of(&data_char, 'Ѓ', 'ѓ'),
		'Є' | 'є' => one_of(&data_char, 'Є', 'є'),
		'Ѕ' | 'ѕ' => one_of(&data_char, 'Ѕ', 'ѕ'),
		'І' | 'і' => one_of(&data_char, 'І', 'і'),
		'Ї' | 'ї' => one_of(&data_char, 'Ї', 'ї'),
		'Ј' | 'ј' => one_of(&data_char, 'Ј', 'ј'),
		'Љ' | 'љ' => one_of(&data_char, 'Љ', 'љ'),
		'Њ' | 'њ' => one_of(&data_char, 'Њ', 'њ'),
		'Ћ' | 'ћ' => one_of(&data_char, 'Ћ', 'ћ'),
		'Ќ' | 'ќ' => one_of(&data_char, 'Ќ', 'ќ'),
		'Ѝ' | 'ѝ' => one_of(&data_char, 'Ѝ', 'ѝ'),
		'Ў' | 'ў' => one_of(&data_char, 'Ў', 'ў'),
		'Џ' | 'џ' => one_of(&data_char, 'Џ', 'џ'),
		'А' | 'а' => one_of(&data_char, 'А', 'а'),
		'Б' | 'б' => one_of(&data_char, 'Б', 'б'),
		'В' | 'в' => one_of(&data_char, 'В', 'в'),
		'Г' | 'г' => one_of(&data_char, 'Г', 'г'),
		'Д' | 'д' => one_of(&data_char, 'Д', 'д'),
		'Е' | 'е' => one_of(&data_char, 'Е', 'е'),
		'Ж' | 'ж' => one_of(&data_char, 'Ж', 'ж'),
		'З' | 'з' => one_of(&data_char, 'З', 'з'),
		'И' | 'и' => one_of(&data_char, 'И', 'и'),
		'Й' | 'й' => one_of(&data_char, 'Й', 'й'),
		'К' | 'к' => one_of(&data_char, 'К', 'к'),
		'Л' | 'л' => one_of(&data_char, 'Л', 'л'),
		'М' | 'м' => one_of(&data_char, 'М', 'м'),
		'Н' | 'н' => one_of(&data_char, 'Н', 'н'),
		'О' | 'о' => one_of(&data_char, 'О', 'о'),
		'П' | 'п' => one_of(&data_char, 'П', 'п'),
		'Р' | 'р' => one_of(&data_char, 'Р', 'р'),
		'С' | 'с' => one_of(&data_char, 'С', 'с'),
		'Т' | 'т' => one_of(&data_char, 'Т', 'т'),
		'У' | 'у' => one_of(&data_char, 'У', 'у'),
		'Ф' | 'ф' => one_of(&data_char, 'Ф', 'ф'),
		'Х' | 'х' => one_of(&data_char, 'Х', 'х'),
		'Ц' | 'ц' => one_of(&data_char, 'Ц', 'ц'),
		'Ч' | 'ч' => one_of(&data_char, 'Ч', 'ч'),
		'Ш' | 'ш' => one_of(&data_char, 'Ш', 'ш'),
		'Щ' | 'щ' => one_of(&data_char, 'Щ', 'щ'),
		'Ъ' | 'ъ' => one_of(&data_char, 'Ъ', 'ъ'),
		'Ы' | 'ы' => one_of(&data_char, 'Ы', 'ы'),
		'Ь' | 'ь' => one_of(&data_char, 'Ь', 'ь'),
		'Э' | 'э' => one_of(&data_char, 'Э', 'э'),
		'Ю' | 'ю' => one_of(&data_char, 'Ю', 'ю'),
		'Я' | 'я' => one_of(&data_char, 'Я', 'я'),
		'Ѡ' | 'ѡ' => one_of(&data_char, 'Ѡ', 'ѡ'),
		'Ѣ' | 'ѣ' => one_of(&data_char, 'Ѣ', 'ѣ'),
		'Ѥ' | 'ѥ' => one_of(&data_char, 'Ѥ', 'ѥ'),
		'Ѧ' | 'ѧ' => one_of(&data_char, 'Ѧ', 'ѧ'),
		'Ѩ' | 'ѩ' => one_of(&data_char, 'Ѩ', 'ѩ'),
		'Ѫ' | 'ѫ' => one_of(&data_char, 'Ѫ', 'ѫ'),
		'Ѭ' | 'ѭ' => one_of(&data_char, 'Ѭ', 'ѭ'),
		'Ѯ' | 'ѯ' => one_of(&data_char, 'Ѯ', 'ѯ'),
		'Ѱ' | 'ѱ' => one_of(&data_char, 'Ѱ', 'ѱ'),
		'Ѳ' | 'ѳ' => one_of(&data_char, 'Ѳ', 'ѳ'),
		'Ѵ' | 'ѵ' => one_of(&data_char, 'Ѵ', 'ѵ'),
		'Ѷ' | 'ѷ' => one_of(&data_char, 'Ѷ', 'ѷ'),
		'Ѹ' | 'ѹ' => one_of(&data_char, 'Ѹ', 'ѹ'),
		'Ѻ' | 'ѻ' => one_of(&data_char, 'Ѻ', 'ѻ'),
		'Ѽ' | 'ѽ' => one_of(&data_char, 'Ѽ', 'ѽ'),
		'Ѿ' | 'ѿ' => one_of(&data_char, 'Ѿ', 'ѿ'),
		'Ҁ' | 'ҁ' => one_of(&data_char, 'Ҁ', 'ҁ'),
		'Ҋ' | 'ҋ' => one_of(&data_char, 'Ҋ', 'ҋ'),
		'Ҍ' | 'ҍ' => one_of(&data_char, 'Ҍ', 'ҍ'),
		'Ҏ' | 'ҏ' => one_of(&data_char, 'Ҏ', 'ҏ'),
		'Ґ' | 'ґ' => one_of(&data_char, 'Ґ', 'ґ'),
		'Ғ' | 'ғ' => one_of(&data_char, 'Ғ', 'ғ'),
		'Ҕ' | 'ҕ' => one_of(&data_char, 'Ҕ', 'ҕ'),
		'Җ' | 'җ' => one_of(&data_char, 'Җ', 'җ'),
		'Ҙ' | 'ҙ' => one_of(&data_char, 'Ҙ', 'ҙ'),
		'Қ' | 'қ' => one_of(&data_char, 'Қ', 'қ'),
		'Ҝ' | 'ҝ' => one_of(&data_char, 'Ҝ', 'ҝ'),
		'Ҟ' | 'ҟ' => one_of(&data_char, 'Ҟ', 'ҟ'),
		'Ҡ' | 'ҡ' => one_of(&data_char, 'Ҡ', 'ҡ'),
		'Ң' | 'ң' => one_of(&data_char, 'Ң', 'ң'),
		'Ҥ' | 'ҥ' => one_of(&data_char, 'Ҥ', 'ҥ'),
		'Ҧ' | 'ҧ' => one_of(&data_char, 'Ҧ', 'ҧ'),
		'Ҩ' | 'ҩ' => one_of(&data_char, 'Ҩ', 'ҩ'),
		'Ҫ' | 'ҫ' => one_of(&data_char, 'Ҫ', 'ҫ'),
		'Ҭ' | 'ҭ' => one_of(&data_char, 'Ҭ', 'ҭ'),
		'Ү' | 'ү' => one_of(&data_char, 'Ү', 'ү'),
		'Ұ' | 'ұ' => one_of(&data_char, 'Ұ', 'ұ'),
		'Ҳ' | 'ҳ' => one_of(&data_char, 'Ҳ', 'ҳ'),
		'Ҵ' | 'ҵ' => one_of(&data_char, 'Ҵ', 'ҵ'),
		'Ҷ' | 'ҷ' => one_of(&data_char, 'Ҷ', 'ҷ'),
		'Ҹ' | 'ҹ' => one_of(&data_char, 'Ҹ', 'ҹ'),
		'Һ' | 'һ' => one_of(&data_char, 'Һ', 'һ'),
		'Ҽ' | 'ҽ' => one_of(&data_char, 'Ҽ', 'ҽ'),
		'Ҿ' | 'ҿ' => one_of(&data_char, 'Ҿ', 'ҿ'),
		'Ӏ' | 'Ӂ' => one_of(&data_char, 'Ӏ', 'Ӂ'),
		'ӂ' | 'Ӄ' => one_of(&data_char, 'ӂ', 'Ӄ'),
		'ӄ' | 'Ӆ' => one_of(&data_char, 'ӄ', 'Ӆ'),
		'ӆ' | 'Ӈ' => one_of(&data_char, 'ӆ', 'Ӈ'),
		'ӈ' | 'Ӊ' => one_of(&data_char, 'ӈ', 'Ӊ'),
		'ӊ' | 'Ӌ' => one_of(&data_char, 'ӊ', 'Ӌ'),
		'ӌ' | 'Ӎ' => one_of(&data_char, 'ӌ', 'Ӎ'),
		'ӎ' | 'ӏ' => one_of(&data_char, 'ӎ', 'ӏ'),
		'Ӑ' | 'ӑ' => one_of(&data_char, 'Ӑ', 'ӑ'),
		'Ӓ' | 'ӓ' => one_of(&data_char, 'Ӓ', 'ӓ'),
		'Ӕ' | 'ӕ' => one_of(&data_char, 'Ӕ', 'ӕ'),
		'Ӗ' | 'ӗ' => one_of(&data_char, 'Ӗ', 'ӗ'),
		'Ә' | 'ә' => one_of(&data_char, 'Ә', 'ә'),
		'Ӛ' | 'ӛ' => one_of(&data_char, 'Ӛ', 'ӛ'),
		'Ӝ' | 'ӝ' => one_of(&data_char, 'Ӝ', 'ӝ'),
		'Ӟ' | 'ӟ' => one_of(&data_char, 'Ӟ', 'ӟ'),
		'Ӡ' | 'ӡ' => one_of(&data_char, 'Ӡ', 'ӡ'),
		'Ӣ' | 'ӣ' => one_of(&data_char, 'Ӣ', 'ӣ'),
		'Ӥ' | 'ӥ' => one_of(&data_char, 'Ӥ', 'ӥ'),
		'Ӧ' | 'ӧ' => one_of(&data_char, 'Ӧ', 'ӧ'),
		'Ө' | 'ө' => one_of(&data_char, 'Ө', 'ө'),
		'Ӫ' | 'ӫ' => one_of(&data_char, 'Ӫ', 'ӫ'),
		'Ӭ' | 'ӭ' => one_of(&data_char, 'Ӭ', 'ӭ'),
		'Ӯ' | 'ӯ' => one_of(&data_char, 'Ӯ', 'ӯ'),
		'Ӱ' | 'ӱ' => one_of(&data_char, 'Ӱ', 'ӱ'),
		'Ӳ' | 'ӳ' => one_of(&data_char, 'Ӳ', 'ӳ'),
		'Ӵ' | 'ӵ' => one_of(&data_char, 'Ӵ', 'ӵ'),
		'Ӷ' | 'ӷ' => one_of(&data_char, 'Ӷ', 'ӷ'),
		'Ӹ' | 'ӹ' => one_of(&data_char, 'Ӹ', 'ӹ'),
		'Ӻ' | 'ӻ' => one_of(&data_char, 'Ӻ', 'ӻ'),
		'Ӽ' | 'ӽ' => one_of(&data_char, 'Ӽ', 'ӽ'),
		'Ӿ' | 'ӿ' => one_of(&data_char, 'Ӿ', 'ӿ'),

		// greek letters/symbols
		// - only case-insensitive matching (é won't match e)
		// - incomplete
		'Α' | 'α' => one_of(&data_char, 'Α', 'α'),
		'Β' | 'β' => one_of(&data_char, 'Β', 'β'),
		'Γ' | 'γ' => one_of(&data_char, 'Γ', 'γ'),
		'Δ' | 'δ' => one_of(&data_char, 'Δ', 'δ'),
		'Ε' | 'ε' => one_of(&data_char, 'Ε', 'ε'),
		'Ζ' | 'ζ' => one_of(&data_char, 'Ζ', 'ζ'),
		'Η' | 'η' => one_of(&data_char, 'Η', 'η'),
		'Θ' | 'θ' => one_of(&data_char, 'Θ', 'θ'),
		'Ι' | 'ι' => one_of(&data_char, 'Ι', 'ι'),
		'Κ' | 'κ' => one_of(&data_char, 'Κ', 'κ'),
		'Λ' | 'λ' => one_of(&data_char, 'Λ', 'λ'),
		'Μ' | 'μ' => one_of(&data_char, 'Μ', 'μ'),
		'Ν' | 'ν' => one_of(&data_char, 'Ν', 'ν'),
		'Ξ' | 'ξ' => one_of(&data_char, 'Ξ', 'ξ'),
		'Ο' | 'ο' => one_of(&data_char, 'Ο', 'ο'),
		'Π' | 'π' => one_of(&data_char, 'Π', 'π'),
		'Ρ' | 'ρ' => one_of(&data_char, 'Ρ', 'ρ'),
		'Σ' | 'σ' => one_of(&data_char, 'Σ', 'σ'),
		'Τ' | 'τ' => one_of(&data_char, 'Τ', 'τ'),
		'Υ' | 'υ' => one_of(&data_char, 'Υ', 'υ'),
		'Φ' | 'φ' => one_of(&data_char, 'Φ', 'φ'),
		'Χ' | 'χ' => one_of(&data_char, 'Χ', 'χ'),
		'Ψ' | 'ψ' => one_of(&data_char, 'Ψ', 'ψ'),
		'Ω' | 'ω' => one_of(&data_char, 'Ω', 'ω'),
		'Ϊ' | 'ϊ' => one_of(&data_char, 'Ϊ', 'ϊ'),
		'Ϋ' | 'ϋ' => one_of(&data_char, 'Ϋ', 'ϋ'),
		'Ͱ' | 'ͱ' => one_of(&data_char, 'Ͱ', 'ͱ'),
		'Ͳ' | 'ͳ' => one_of(&data_char, 'Ͳ', 'ͳ'),
		'Ͷ' | 'ͷ' => one_of(&data_char, 'Ͷ', 'ͷ'),
		'Ϳ' | 'ϳ' => one_of(&data_char, 'Ϳ', 'ϳ'),
		'Ϙ' | 'ϙ' => one_of(&data_char, 'Ϙ', 'ϙ'),
		'Ϛ' | 'ϛ' => one_of(&data_char, 'Ϛ', 'ϛ'),
		'Ϝ' | 'ϝ' => one_of(&data_char, 'Ϝ', 'ϝ'),
		'Ϟ' | 'ϟ' => one_of(&data_char, 'Ϟ', 'ϟ'),
		'Ϡ' | 'ϡ' => one_of(&data_char, 'Ϡ', 'ϡ'),
		'Ά' | 'ά' => one_of(&data_char, 'Ά', 'ά'),
		'Έ' | 'έ' => one_of(&data_char, 'Έ', 'έ'),
		'Ή' | 'ή' => one_of(&data_char, 'Ή', 'ή'),
		'Ί' | 'ί' => one_of(&data_char, 'Ί', 'ί'),
		'Ό' | 'ό' => one_of(&data_char, 'Ό', 'ό'),
		'Ύ' | 'ύ' => one_of(&data_char, 'Ύ', 'ύ'),
		'Ώ' | 'ώ' => one_of(&data_char, 'Ώ', 'ώ'),
		'Ϸ' | 'ϸ' => one_of(&data_char, 'Ϸ', 'ϸ'),
		'Ϻ' | 'ϻ' => one_of(&data_char, 'Ϻ', 'ϻ'),
		'Ͻ' | 'ͻ' => one_of(&data_char, 'Ͻ', 'ͻ'),
		'Ͼ' | 'ͼ' => one_of(&data_char, 'Ͼ', 'ͼ'),
		'Ͽ' | 'ͽ' => one_of(&data_char, 'Ͽ', 'ͽ'),
		'Ϗ' | 'ϗ' => one_of(&data_char, 'Ϗ', 'ϗ'),
		'ϴ' | 'ϑ' => one_of(&data_char, 'ϴ', 'ϑ'),
		'Ϲ' | 'ϲ' => one_of(&data_char, 'Ϲ', 'ϲ'),

		// coptic
		'Ϣ' | 'ϣ' => one_of(&data_char, 'Ϣ', 'ϣ'),
		'Ϥ' | 'ϥ' => one_of(&data_char, 'Ϥ', 'ϥ'),
		'Ϧ' | 'ϧ' => one_of(&data_char, 'Ϧ', 'ϧ'),
		'Ϩ' | 'ϩ' => one_of(&data_char, 'Ϩ', 'ϩ'),
		'Ϫ' | 'ϫ' => one_of(&data_char, 'Ϫ', 'ϫ'),
		'Ϭ' | 'ϭ' => one_of(&data_char, 'Ϭ', 'ϭ'),
		'Ϯ' | 'ϯ' => one_of(&data_char, 'Ϯ', 'ϯ'),

		// armenian
		'Ա' | 'ա' => one_of(&data_char, 'Ա', 'ա'),
		'Բ' | 'բ' => one_of(&data_char, 'Բ', 'բ'),
		'Գ' | 'գ' => one_of(&data_char, 'Գ', 'գ'),
		'Դ' | 'դ' => one_of(&data_char, 'Դ', 'դ'),
		'Ե' | 'ե' => one_of(&data_char, 'Ե', 'ե'),
		'Զ' | 'զ' => one_of(&data_char, 'Զ', 'զ'),
		'Է' | 'է' => one_of(&data_char, 'Է', 'է'),
		'Ը' | 'ը' => one_of(&data_char, 'Ը', 'ը'),
		'Թ' | 'թ' => one_of(&data_char, 'Թ', 'թ'),
		'Ժ' | 'ժ' => one_of(&data_char, 'Ժ', 'ժ'),
		'Ի' | 'ի' => one_of(&data_char, 'Ի', 'ի'),
		'Լ' | 'լ' => one_of(&data_char, 'Լ', 'լ'),
		'Խ' | 'խ' => one_of(&data_char, 'Խ', 'խ'),
		'Ծ' | 'ծ' => one_of(&data_char, 'Ծ', 'ծ'),
		'Կ' | 'կ' => one_of(&data_char, 'Կ', 'կ'),
		'Հ' | 'հ' => one_of(&data_char, 'Հ', 'հ'),
		'Ձ' | 'ձ' => one_of(&data_char, 'Ձ', 'ձ'),
		'Ղ' | 'ղ' => one_of(&data_char, 'Ղ', 'ղ'),
		'Ճ' | 'ճ' => one_of(&data_char, 'Ճ', 'ճ'),
		'Մ' | 'մ' => one_of(&data_char, 'Մ', 'մ'),
		'Յ' | 'յ' => one_of(&data_char, 'Յ', 'յ'),
		'Ն' | 'ն' => one_of(&data_char, 'Ն', 'ն'),
		'Շ' | 'շ' => one_of(&data_char, 'Շ', 'շ'),
		'Ո' | 'ո' => one_of(&data_char, 'Ո', 'ո'),
		'Չ' | 'չ' => one_of(&data_char, 'Չ', 'չ'),
		'Պ' | 'պ' => one_of(&data_char, 'Պ', 'պ'),
		'Ջ' | 'ջ' => one_of(&data_char, 'Ջ', 'ջ'),
		'Ռ' | 'ռ' => one_of(&data_char, 'Ռ', 'ռ'),
		'Ս' | 'ս' => one_of(&data_char, 'Ս', 'ս'),
		'Վ' | 'վ' => one_of(&data_char, 'Վ', 'վ'),
		'Տ' | 'տ' => one_of(&data_char, 'Տ', 'տ'),
		'Ր' | 'ր' => one_of(&data_char, 'Ր', 'ր'),
		'Ց' | 'ց' => one_of(&data_char, 'Ց', 'ց'),
		'Ւ' | 'ւ' => one_of(&data_char, 'Ւ', 'ւ'),
		'Փ' | 'փ' => one_of(&data_char, 'Փ', 'փ'),
		'Ք' | 'ք' => one_of(&data_char, 'Ք', 'ք'),
		'Օ' | 'օ' => one_of(&data_char, 'Օ', 'օ'),
		'Ֆ' | 'ֆ' => one_of(&data_char, 'Ֆ', 'ֆ'),

		// cherokee
		'Ᏸ' | 'ᏸ' => one_of(&data_char, 'Ᏸ', 'ᏸ'),
		'Ᏹ' | 'ᏹ' => one_of(&data_char, 'Ᏹ', 'ᏹ'),
		'Ᏺ' | 'ᏺ' => one_of(&data_char, 'Ᏺ', 'ᏺ'),
		'Ᏻ' | 'ᏻ' => one_of(&data_char, 'Ᏻ', 'ᏻ'),
		'Ᏼ' | 'ᏼ' => one_of(&data_char, 'Ᏼ', 'ᏼ'),

		_ => false,
	};
	return match is_match {
		true => Eq::True,
		false => Eq::False,
	};
}
