use crate::data::Data;
use crate::data_js::get_data;

use super::Tag;
use lazy_static::lazy_static;
use napi::bindgen_prelude::Buffer;
use napi::{Env, JsBuffer, JsObject, Result, Task};
use photon_rs::transform::{resize, SamplingFilter};
use photon_rs::PhotonImage;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

// /// File path, artwork index
// struct ReadCover(PathBuf, usize);
// impl Task for ReadCover {
// 	type Output = Vec<u8>;
// 	type JsValue = JsBuffer;
// 	fn compute(&mut self) -> Result<Self::Output> {
// 		let path = &self.0;
// 		let index = self.1;

// 		let tag = Tag::read_from_path(path)?;
// 		let image = match tag.get_image_consume(index) {
// 			Some(image) => image,
// 			None => {
// 				return Err(nerr!("No image"));
// 			}
// 		};

// 		let photon_img = PhotonImage::new_from_byteslice(image.data);
// 		let resized = resize(&photon_img, 15, 15, SamplingFilter::Lanczos3);
// 		let jpg_bytes = resized.get_bytes_jpeg(95);

// 		Ok(jpg_bytes)
// 	}
// 	fn resolve(&mut self, env: Env, output: Self::Output) -> Result<Self::JsValue> {
// 		let data = get_data(&env)?;
// 		// let path = self.0.to_string_lossy().to_string();
// 		// data.img_cache.insert(path, output.clone());
// 		let result = env.create_buffer_copy(output)?;
// 		return Ok(result.into_raw());
// 	}
// }

// #[napi(
// 	js_name = "read_cache_cover_async",
// 	ts_return_type = "Promise<ArrayBuffer>"
// )]
// #[allow(dead_code)]
// pub fn read_cache_cover_async(path: String, index: u16, env: Env) -> Result<JsObject> {
// 	let task = ReadCover(path.into(), index.into());
// 	env.spawn(task).map(|t| t.promise_object())
// }

lazy_static! {
	static ref IMG_CACHE: Mutex<HashMap<String, Vec<u8>>> = Mutex::new(HashMap::new());
}

#[napi(js_name = "read_cache_cover_async")]
#[allow(dead_code)]
pub async fn read_cache_cover_async(path: String, index: u16) -> Result<Buffer> {
	let img_cache = IMG_CACHE.lock().unwrap();
	if let Some(bytes) = img_cache.get(&path) {
		println!("-------------- cache hit");
		return Ok(bytes.clone().into());
	}
	drop(img_cache);

	let tag = Tag::read_from_path(&PathBuf::from(path.clone()))?;
	let image = match tag.get_image_consume(index.into()) {
		Some(image) => image,
		None => {
			return Err(nerr!("No image"));
		}
	};

	let photon_img = PhotonImage::new_from_byteslice(image.data);
	let resized = resize(&photon_img, 15, 15, SamplingFilter::Lanczos3);
	let jpg_bytes = resized.get_bytes_jpeg(95);

	let mut img_cache = IMG_CACHE.lock().unwrap();
	img_cache.insert(path, jpg_bytes.clone());

	Ok(jpg_bytes.into())
}
