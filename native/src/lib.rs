#[macro_use]
extern crate napi_derive;
use std::fs::copy;
#[allow(unused_imports)]
use napi::{JsNull, CallContext, JsObject, Result as NapiResult, Error as NapiError, JsString};

fn arg_to_string(ctx: &CallContext, arg: usize) -> NapiResult<String> {
  let js_string = ctx.get::<JsString>(arg)?;
  let js_utf8_string = js_string.into_utf8()?;
  let rust_string = js_utf8_string.as_str()?.to_string();
  return Ok(rust_string)
}

#[js_function(2)]
fn copy_file(ctx: CallContext) -> NapiResult<JsNull> {
  let from = arg_to_string(&ctx, 0)?;
  let to = arg_to_string(&ctx, 1)?;
  copy(from, to)?;
  ctx.env.get_null()
}

#[module_exports]
fn init(mut exports: JsObject) -> NapiResult<()> {
  exports.create_named_method("copy_file", copy_file)?;
  Ok(())
}
