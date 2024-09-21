use super::Tag;
use fast_image_resize::images::Image;
use fast_image_resize::{IntoImageView, Resizer};
use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::PngEncoder;
use image::{ImageEncoder, ImageFormat, ImageReader};
use lazy_static::lazy_static;
use lofty::picture::MimeType;
use napi::bindgen_prelude::Buffer;
use napi::Result;
use redb::{Database, TableDefinition};
use std::io::{BufWriter, Cursor};
use std::path::PathBuf;
use std::sync::{Arc, RwLock};

const IMG_CACHE_TABLE: TableDefinition<&str, Vec<u8>> = TableDefinition::new("img_cache");

lazy_static! {
	static ref CACHE_DB: Arc<RwLock<Option<Database>>> = Arc::new(RwLock::new(None));
}

#[napi(js_name = "read_cache_cover_async")]
#[allow(dead_code)]
/// Returns `None` if the file does not have an image
pub async fn read_cache_cover_async(
	path: String,
	index: u16,
	cache_db_path: String,
) -> Result<Option<Buffer>> {
	let cache_db_mutex = CACHE_DB.read().unwrap();
	if cache_db_mutex.is_none() {
		drop(cache_db_mutex);
		let mut cache_db_mutex = CACHE_DB.write().unwrap();
		if cache_db_mutex.is_none() {
			let db = match Database::create(&cache_db_path) {
				Ok(db) => db,
				Err(err) => panic!("Could not load image cache: {}", err),
			};
			let init_txn = db.begin_write().unwrap();
			{
				// Create table
				init_txn.open_table(IMG_CACHE_TABLE).unwrap();
			}
			init_txn.commit().unwrap();
			*cache_db_mutex = Some(db);
			println!("Initialized Cache.redb");
		}
	}

	let cache_db_mutex = CACHE_DB.read().unwrap();
	let cache_db = cache_db_mutex.as_ref().unwrap();
	let read_txn = cache_db.begin_read().unwrap();
	{
		let table = read_txn.open_table(IMG_CACHE_TABLE).unwrap();
		let record = table.get(&*path).unwrap();
		if let Some(cache_entry) = record {
			let bytes: Vec<u8> = cache_entry.value();
			return Ok(Some(bytes.into()));
		}
	}

	let tag = Tag::read_from_path(&PathBuf::from(path.clone()))?;
	let image = match tag.get_image_consume(index.into())? {
		Some(image) => image,
		None => {
			return Ok(None);
		}
	};

	let format = match image.mime_type {
		MimeType::Png => ImageFormat::Png,
		MimeType::Jpeg => ImageFormat::Jpeg,
		_ => return Err(nerr!("Unsupported image type")),
	};

	let image = match ImageReader::new(Cursor::new(image.data)).with_guessed_format() {
		Ok(image) => image,
		Err(e) => return Err(nerr!("Unable to guess image format: {}", e)),
	};
	let src_image = match image.decode() {
		Ok(image_data) => image_data,
		Err(e) => return Err(nerr!("Unable to decode image: {}", e)),
	};

	let dst_width = 84;
	let dst_height = 84;
	let mut dst_image = Image::new(dst_width, dst_height, src_image.pixel_type().unwrap());

	let mut resizer = Resizer::new();
	resizer.resize(&src_image, &mut dst_image, None).unwrap();

	let mut result_buf = BufWriter::new(Vec::new());
	let img_bytes = match format {
		ImageFormat::Jpeg => {
			let jpeg_result = JpegEncoder::new(&mut result_buf).write_image(
				dst_image.buffer(),
				dst_width,
				dst_height,
				src_image.color().into(),
			);
			match jpeg_result {
				Ok(_) => {}
				Err(err) => {
					return Err(nerr!(
						"Unable to encode image in track \"{}\": {}",
						path,
						err
					))
				}
			}
			let bytes = match result_buf.into_inner() {
				Ok(bytes) => bytes,
				Err(_) => return Err(nerr!("Error getting inner img buffer")),
			};
			bytes
		}
		ImageFormat::Png => {
			let jpeg_result = PngEncoder::new(&mut result_buf).write_image(
				dst_image.buffer(),
				dst_width,
				dst_height,
				src_image.color().into(),
			);
			match jpeg_result {
				Ok(_) => {}
				Err(err) => {
					return Err(nerr!(
						"Unable to encode image in track \"{}\": {}",
						path,
						err
					))
				}
			}
			let bytes = match result_buf.into_inner() {
				Ok(bytes) => bytes,
				Err(_) => return Err(nerr!("Error getting inner img buffer")),
			};
			bytes
		}
		_ => return Err(nerr!("Unsupported image type")),
	};

	let write_txn = cache_db.begin_write().unwrap();
	{
		let mut table = write_txn.open_table(IMG_CACHE_TABLE).unwrap();
		table.insert(&*path, img_bytes.clone()).unwrap();
	}
	write_txn.commit().unwrap();

	Ok(Some(img_bytes.into()))
}
