use crate::data::{load_data, Data};
use crate::js::{arg_to_bool, nr};
use crate::{filter, page, tracks};
use napi::{CallContext, JsObject, JsUndefined, JsUnknown, Result as NResult};
use napi_derive::js_function;

pub fn get_data<'a>(ctx: &'a CallContext) -> NResult<&'a mut Data> {
  let this: JsObject = ctx.this()?;
  let data: &mut Data = ctx.env.unwrap(&this)?;
  return Ok(data);
}

#[js_function(1)]
pub fn load_data_js(ctx: CallContext) -> NResult<JsObject> {
  let is_dev = arg_to_bool(&ctx, 0)?;

  let data: Data = nr(load_data(&is_dev))?;

  let mut new_this: JsObject = ctx.env.create_object()?;
  ctx.env.wrap(&mut new_this, data)?;
  new_this = init_data_instance(new_this)?;
  return Ok(new_this);
}

#[js_function(0)]
pub fn get_paths(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let js_obj = ctx.env.to_js_value(&data.paths);
  return js_obj;
}

#[js_function(0)]
pub fn save(ctx: CallContext) -> NResult<JsUndefined> {
  let data: &mut Data = get_data(&ctx)?;
  data.save()?;
  return ctx.env.get_undefined();
}

#[js_function(0)]
fn get_track_lists(ctx: CallContext) -> NResult<JsUnknown> {
  let data: &mut Data = get_data(&ctx)?;
  let track_lists = &data.library.trackLists;
  let js = ctx.env.to_js_value(&track_lists)?;
  return Ok(js);
}

fn init_data_instance(mut exports: JsObject) -> NResult<JsObject> {
  exports.create_named_method("get_paths", get_paths)?;
  exports.create_named_method("save", save)?;

  exports.create_named_method("get_track_lists", get_track_lists)?;

  exports.create_named_method("import_track", tracks::import)?;
  exports.create_named_method("get_track", tracks::get_track)?;
  exports.create_named_method("add_play", tracks::add_play)?;
  exports.create_named_method("add_skip", tracks::add_skip)?;
  exports.create_named_method("add_play_time", tracks::add_play_time)?;
  exports.create_named_method("read_cover_async", tracks::read_cover_async)?;

  exports.create_named_method("refresh_page", page::refresh)?;
  exports.create_named_method("open_playlist", page::open_playlist)?;
  exports.create_named_method("get_page_track_ids", page::get_page_track_ids)?;
  exports.create_named_method("filter_open_playlist", filter::filter_js)?;
  exports.create_named_method("get_page_track", page::get_page_track)?;
  exports.create_named_method("get_page_track_id", page::get_page_track_id)?;
  exports.create_named_method("get_page_info", page::get_page_info)?;
  exports.create_named_method("sort", page::sort_js)?;

  return Ok(exports);
}
