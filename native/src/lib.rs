#[macro_use]
extern crate napi_derive;

use napi::{CallContext, JsObject, Result, JsString};

#[js_function(1)]
fn hello(ctx: CallContext) -> Result<JsString> {
  ctx.env.create_string("hello node")
}

#[module_exports]
fn init(mut exports: JsObject) -> Result<()> {
  exports.create_named_method("hello", hello)?;
  Ok(())
}
