use std::time::{SystemTime, UNIX_EPOCH};

mod js;
mod library;
mod library_types;
mod sort;

mod data;
mod data_js;
mod open_playlist;
mod tracks;

fn get_now_timestamp() -> i64 {
  let timestamp = match SystemTime::now().duration_since(UNIX_EPOCH) {
    Ok(n) => n.as_millis() as i64,
    Err(_) => panic!("Generated timestamp is earlier than Unix Epoch"),
  };
  return timestamp;
}

fn sys_time_to_timestamp(sys_time: &SystemTime) -> i64 {
  let timestamp = match sys_time.duration_since(UNIX_EPOCH) {
    Ok(n) => n.as_millis() as i64,
    Err(_) => panic!("Timestamp is earlier than Unix Epoch"),
  };
  return timestamp;
}
