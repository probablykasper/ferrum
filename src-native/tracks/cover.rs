use super::Tag;
use image::codecs::jpeg::JpegEncoder;
use lazy_static::lazy_static;
use lofty::picture::MimeType;
use napi::bindgen_prelude::Buffer;
use napi::Result;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

use fast_image_resize::images::Image;
use fast_image_resize::{IntoImageView, Resizer};
use image::{ImageEncoder, ImageFormat, ImageReader};
use std::io::{BufWriter, Cursor};

lazy_static! {
	static ref IMG_CACHE: Mutex<HashMap<String, Option<Vec<u8>>>> = Mutex::new(HashMap::new());
}

#[napi(js_name = "read_cache_cover_async")]
#[allow(dead_code)]
/// Returns `None` if the file does not have an image
pub async fn read_cache_cover_async(path: String, index: u16) -> Result<Option<Buffer>> {
	println!("{path} 0");
	let img_cache = IMG_CACHE.lock().unwrap();
	if let Some(cache_entry) = img_cache.get(&path) {
		return Ok(cache_entry.clone().map(|bytes| bytes.clone().into()));
	}
	drop(img_cache);

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

	let mut image = ImageReader::new(Cursor::new(image.data));
	image.set_format(format);
	let src_image = match image.decode() {
		Ok(image_data) => image_data,
		Err(e) => return Err(nerr!("Unable to decode image: {}", e)),
	};

	let dst_width = 1024;
	let dst_height = 768;
	let mut dst_image = Image::new(dst_width, dst_height, src_image.pixel_type().unwrap());

	let mut resizer = Resizer::new();
	resizer.resize(&src_image, &mut dst_image, None).unwrap();

	let mut result_buf = BufWriter::new(Vec::new());
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
	let jpg_bytes = match result_buf.into_inner() {
		Ok(bytes) => bytes,
		Err(_) => return Err(nerr!("Error getting inner img buffer")),
	};

	let mut img_cache = IMG_CACHE.lock().unwrap();
	img_cache.insert(path, Some(jpg_bytes.clone()));

	Ok(Some(jpg_bytes.into()))
}
