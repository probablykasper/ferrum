use crate::data_js::{load_data_async, load_data_js};
use atomicwrites::{AllowOverwrite, AtomicFile};
use napi::{
  CallContext, Error as NapiError, JsBoolean, JsNumber, JsObject, JsString, JsTypedArray,
  Result as NResult,
};
use napi_derive::module_exports;
use std::convert::TryFrom;
use std::convert::TryInto;
use std::fs::copy;
use std::io::Write;

// Create NapiError from string
pub fn nerr(msg: &str) -> NapiError {
  return NapiError::from_reason(msg.to_owned());
}

pub fn arg_to_string(ctx: &CallContext, arg: usize) -> NResult<String> {
  let js_string: JsString = ctx.get(arg)?;
  let js_utf8_string = js_string.into_utf8()?;
  let rust_string = js_utf8_string.as_str()?.to_string();
  return Ok(rust_string);
}

pub fn arg_to_bool(ctx: &CallContext, arg: usize) -> NResult<bool> {
  let js_bool: JsBoolean = ctx.get(arg)?;
  let rust_bool = js_bool.get_value()?;
  return Ok(rust_bool);
}

pub fn arg_to_number<N: TryFrom<JsNumber, Error = napi::Error>>(
  ctx: &CallContext,
  arg: usize,
) -> NResult<N> {
  let js_number: JsNumber = ctx.get(arg)?;
  let number: N = match js_number.try_into() {
    Ok(n) => n,
    Err(err) => return Err(err),
  };
  return Ok(number);
}

pub fn arg_to_number_vector<N: TryFrom<JsNumber, Error = napi::Error>>(
  ctx: &CallContext,
  arg: usize,
) -> NResult<Vec<N>> {
  let js_array: JsTypedArray = ctx.get(arg)?;
  let length: u32 = js_array.get_array_length()?;
  let mut vector: Vec<N> = Vec::new();
  for i in 0..length {
    let js_number: JsNumber = js_array.get_element(i)?;
    match js_number.try_into() {
      Ok(n) => vector.push(n),
      Err(err) => return Err(err),
    };
  }
  return Ok(vector);
}

pub fn arg_to_string_vector(ctx: &CallContext, arg: usize) -> NResult<Vec<String>> {
  let js_array: JsTypedArray = ctx.get(arg)?;
  let length: u32 = js_array.get_array_length()?;
  let mut vector: Vec<String> = Vec::new();
  for i in 0..length {
    let js_string: JsString = js_array.get_element(i)?;
    let js_utf8_string = js_string.into_utf8()?;
    let rust_string = js_utf8_string.as_str()?.to_string();
    vector.push(rust_string);
  }
  return Ok(vector);
}

#[napi]
#[allow(dead_code)]
fn copy_file(from: String, to: String) -> napi::Result<()> {
  match copy(from, to) {
    Ok(_) => Ok(()),
    Err(err) => Err(err.into()),
  }
}

#[napi]
#[allow(dead_code)]
fn atomic_file_save(file_path: String, content: String) {
  let af = AtomicFile::new(file_path, AllowOverwrite);
  af.write(|f| f.write_all(content.as_bytes())).unwrap();
}

#[module_exports]
fn init(mut exports: JsObject) -> NResult<()> {
  // exports.create_named_method("copy_file", copy_file)?;
  // exports.create_named_method("atomic_file_save", atomic_file_save)?;
  exports.create_named_method("load_data", load_data_js)?;
  exports.create_named_method("load_data_async", load_data_async)?;
  Ok(())
}
