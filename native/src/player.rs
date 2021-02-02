use crate::data::Data;
use redlux::Decoder as AacDecoder;
use rodio::{OutputStream, Sink};
use serde::{Deserialize, Serialize};
use std::fmt::Debug;
use std::fs::File;
use std::io::BufReader;
// use std::path::Path;
use std::sync::mpsc::{channel, Sender};
use std::thread;

pub struct Player {
  pub sender: Sender<Message>,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum Message {
  PlayPause,
  PlayPath(String),
  Quit,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Event {
  Play,
  Pause,
  Error(String),
}

fn handle_message(
  msg: Message,
  sink: &Sink,
  send_event: &dyn Fn(Event),
) -> Result<(), &'static str> {
  match msg {
    Message::PlayPause => {
      if sink.is_paused() {
        sink.play();
        send_event(Event::Play);
      } else {
        sink.pause();
        send_event(Event::Pause);
      }
    }
    Message::PlayPath(path) => {
      // let mut path = "Krewella - Bitch of the Year.m4a".to_string();
      // let mut path = "Krewella - Bitch of the Year.aac".to_string();
      // let mut path = "Simbai & Elke Bay - Energy.m4a".to_string();
      // let mut path =
      //   "Kill Paris feat. Big Gigantic & Jimi Tents - Fizzy Lifting Drink.mp3".to_string();
      // path = "/Users/kasper/Music/Ferrum Dev/Tracks/".to_string() + &path;

      let file = File::open(&path).or(Err("Error opening file"))?;

      if path.ends_with(".m4a") {
        let metadata = file.metadata().or(Err("Error getting file metadata"))?;
        let size = metadata.len();
        let m4a_buf = BufReader::new(file);
        let decoder = AacDecoder::new_mpeg4(m4a_buf, size)?;
        sink.append(decoder);
      } else {
        let buf = BufReader::new(file);
        let decoder = rodio::Decoder::new(buf).or(Err("Error decoding file"))?;
        sink.append(decoder);
      };

      sink.play();
      sink.set_volume(0.01);
      send_event(Event::Play);
    }
    Message::Quit => {}
  }
  return Ok(());
}

fn create_sink() -> Result<(OutputStream, Sink), &'static str> {
  let output_stream = rodio::OutputStream::try_default();
  let (stream, handle) = output_stream.or(Err("Error creating output stream"))?;
  let sink = rodio::Sink::try_new(&handle).or(Err("Error creating sink"))?;
  return Ok((stream, sink));
}

pub fn init_player<F: 'static>(send_event: F) -> Result<Player, &'static str>
where
  F: Fn(Event) + Send,
{
  let (sender, receiver) = channel();
  thread::spawn(move || {
    // _stream needs to be here, otherwise audio will not play
    let (_stream, sink) = match create_sink() {
      Ok(vars) => vars,
      Err(msg) => {
        send_event(Event::Error(msg.to_string()));
        return;
      }
    };

    // `recv()` blocks, which allows audio to keep playing
    while let Ok(msg) = receiver.recv() {
      if let Message::Quit = msg {
        return;
      }
      let result = handle_message(msg, &sink, &send_event);
      if let Err(result) = result {
        send_event(Event::Error(result.to_string()));
      }
    }
  });
  return Ok(Player { sender: sender });
}

pub fn play_pause(data: &mut Data) -> Result<(), &'static str> {
  data
    .player
    .sender
    .send(Message::PlayPause)
    .expect("PlayPause event error");
  return Ok(());
}

pub fn play_id(data: &mut Data, id: &str) -> Result<(), &'static str> {
  let track = data.library.tracks.get(id).ok_or("Track ID not found")?;
  let track_path = data.paths.tracks_dir.join(&track.file);
  let track_path_str = track_path.to_str().ok_or("Track path error")?;

  let play_path = Message::PlayPath(track_path_str.to_string());
  data
    .player
    .sender
    .send(play_path)
    .expect("PlayPath event error");

  return Ok(());
}
