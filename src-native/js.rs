use atomicwrites::{AllowOverwrite, AtomicFile};
use napi::Error as NapiError;
use std::fs::copy;
use std::io::Write;

// Create NapiError from string
pub fn nerr(msg: &str) -> NapiError {
  return NapiError::from_reason(msg.to_owned());
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
