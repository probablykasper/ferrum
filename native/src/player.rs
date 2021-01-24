use rodio::{Sink, OutputStream};
use std::fmt::Debug;
use crate::data::Data;
use std::fs::File;
use std::io::BufReader;
use std::thread;
use std::sync::mpsc::{channel, Sender};
use serde::{Deserialize, Serialize};

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

fn handle_message(msg: Message, sink: &Sink, send_event: &dyn Fn(Event)) -> Result<(), &'static str> {
  match msg {
    Message::PlayPause => {
      if sink.is_paused() {
        sink.play();
        send_event(Event::Play);
      } else {
        sink.pause();
        send_event(Event::Pause);
      }
    },
    Message::PlayPath(path) => {
      let file = File::open(path)
        .or(Err("Error opening file"))?;
      let buf = BufReader::new(file);
      let decoder = rodio::Decoder::new(buf)
        .or(Err("Error decoding file"))?;
      sink.append(decoder);
      sink.play();
      send_event(Event::Play);
    },
    Message::Quit => {}
  }
  return Ok(())
}

fn create_sink() -> Result<(OutputStream, Sink), &'static str> {
  let (stream, handle) = rodio::OutputStream::try_default()
    .or(Err("Error creating output stream"))?;
  let sink = rodio::Sink::try_new(&handle)
    .or(Err("Error creating sink"))?;
  return Ok((stream, sink))
}

pub fn init_player<F: 'static>(send_event: F) -> Result<Player, &'static str> where F: Fn(Event) + Send {
  let (sender, receiver) = channel();
  thread::spawn(move|| {
    // _stream needs to be here, otherwise audio will not play
    let (_stream, sink) = match create_sink() {
      Ok(vars) => vars,
      Err(msg) => {
        send_event(Event::Error(msg.to_string()));
        return
      }
    };

    // `recv()` blocks, which allows audio to keep playing
    while let Ok(msg) = receiver.recv() {
      if let Message::Quit = msg {
        return
      }
      let result = handle_message(msg, &sink, &send_event);
      if let Err(result) = result {
        send_event(Event::Error(result.to_string()));
      }
    }

  });
  return Ok(Player {
    sender: sender,
  })
}

pub fn play_pause(data: &mut Data) -> Result<(), &'static str> {
  data.player.sender.send(Message::PlayPause).expect("PlayPause event error");
  return Ok(())
}

pub fn play_id(data: &mut Data, id: &str) -> Result<(), &'static str> {

  let track = data.library.tracks.get(id).ok_or("Track ID not found")?;
  let track_path = data.paths.tracks_dir.join(&track.file);
  let track_path_str = track_path.to_str().ok_or("Track path error")?;

  let play_path = Message::PlayPath(track_path_str.to_string());
  data.player.sender.send(play_path).expect("PlayPath event error");

  return Ok(())
}
