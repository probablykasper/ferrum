#[macro_use]
extern crate napi_derive;
extern crate dirs;
mod funcs;
use funcs::get_path;
use napi::{CallContext, JsObject, Result as NapiResult, Error as NapiError, JsString};

#[js_function(1)]
fn w_get_path(ctx: CallContext) -> NapiResult<JsString> {
  match get_path() {
    Ok(value) => Ok(ctx.env.create_string(&value)?),
    Err(e) => {
      Err(NapiError::from_reason(e))
    },
  }
}

#[module_exports]
fn init(mut exports: JsObject) -> NapiResult<()> {
  exports.create_named_method("get_path", w_get_path)?;
  Ok(())
}
