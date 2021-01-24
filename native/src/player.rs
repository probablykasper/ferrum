use std::fmt::Debug;
use crate::data::Data;
use std::fs::File;
use std::io::BufReader;
use std::thread;
use std::sync::mpsc::{channel, Sender};
use serde::{Deserialize, Serialize};

pub struct Player {
  pub sender: Sender<Message>,
  pub paused: bool,
  pub stopped: bool,
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
}

pub fn init_player<F: 'static>(event_handler: F) -> Result<Player, &'static str> where F: Fn(Event) + Send {
  let (sender, receiver) = channel();
  thread::spawn(move|| {
    let (_stream, handle) = rodio::OutputStream::try_default().unwrap();
    let sink = rodio::Sink::try_new(&handle).unwrap();

    while let Ok(msg) = receiver.recv() { // Note: `recv()` always blocks
      println!("Received {:?}", msg);
      if let Message::Quit = msg {
        return
      }
      match msg {
        Message::PlayPause => {
          if sink.is_paused() {
            sink.play();
            event_handler(Event::Play);
          } else {
            sink.pause();
            event_handler(Event::Pause);
          }
        },
        Message::PlayPath(path) => {
          let file = File::open(path).unwrap();
          sink.append(rodio::Decoder::new(BufReader::new(file)).unwrap());
        },
        Message::Quit => {}
      }
    }

  });
  return Ok(Player {
    sender: sender,
    paused: true,
    stopped: true,
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
