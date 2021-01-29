use crate::aac_decoder;
use crate::data::Data;
use rodio::{OutputStream, Sink};
use std::fmt::Debug;
use std::fs::File;
use std::io::SeekFrom;
// use std::io::BufReader;
use serde::{Deserialize, Serialize};
use std::io::{BufReader, Error, ErrorKind, Read, Seek};
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

struct M4aSamplesReader<R>
where
  R: Read + Seek,
{
  mp4: mp4::Mp4Reader<R>,
  track_id: u32,
  position: u32,
  bytes: mp4::Bytes,
  current_byte: usize,
}

impl<R: Read + Seek> M4aSamplesReader<R> {
  pub fn new(mp4: mp4::Mp4Reader<R>) -> Result<M4aSamplesReader<R>, &'static str> {
    for track in mp4.tracks().iter() {
      let track_id = track.track_id();
      // let track = mp4.tracks().get(track_id as usize)
      //   .ok_or("Error getting track id")?;
      let media_type = track.media_type().or(Err("Error getting media type"))?;
      match media_type {
        mp4::MediaType::AAC => {
          return Ok(M4aSamplesReader {
            mp4,
            track_id: track_id,
            position: 1,
            bytes: mp4::Bytes::new(),
            current_byte: 0,
          })
        }
        _ => return Err("Track is not AAC"),
      }
    }
    Err("No aac track found")
  }
}

impl<R: Read + Seek> Read for M4aSamplesReader<R> {
  fn read(&mut self, buf: &mut [u8]) -> Result<usize, Error> {
    let mut items = 0;
    println!("BUF len {}", buf.len());
    println!("buf0: {:?}", buf.get(0));
    for buf in buf.iter_mut() {
      if self.current_byte == self.bytes.len() {
        println!("TID: {}, SID: {}", self.track_id, self.position);
        let sample = self
          .mp4
          .read_sample(self.track_id, self.position)
          .or(Err(Error::new(ErrorKind::Other, "Error reading sample")))?;
        match sample {
          Some(sample) => {
            // println!("bytes: {:?}", sample.bytes);
            println!("bytes len: {}", sample.bytes.len());
            self.bytes = sample.bytes;
            self.current_byte = 0;
          }
          None => {
            println!("NO SAMPLE OPTION");
            return Ok(items);
          }
        }
        self.position += 1;
      }
      *buf = self.bytes[self.current_byte];
      self.current_byte += 1;
      items += 1;
    }
    println!("items {}", items);
    println!("  buf0: {:?}", buf.get(0));
    // println!("BUF {:?}", buf);
    Ok(items)
  }
}

impl<R: Read + Seek> Seek for M4aSamplesReader<R> {
  fn seek(&mut self, pos: SeekFrom) -> Result<u64, Error> {
    match pos {
      SeekFrom::Start(offset) => {
        println!("SeekFrom::Start, offset: {}", offset);
        self.position = offset as u32;
      }
      SeekFrom::End(_offset) => {
        // return Err(Error::new(ErrorKind::Other, "SeekFrom::End not supported"))
        panic!("SeekFrom::End not supported");
      }
      SeekFrom::Current(offset) => {
        println!("SeekFrom::Current, offset: {}", offset);
        self.position += offset as u32;
      }
    }
    return Ok(self.position as u64);
  }
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
      let f = File::open(path).or(Err("Error opening file"))?;

      let metadata = f.metadata().or(Err("Error getting file metadata"))?;
      let size = metadata.len();
      let m4a_buf = BufReader::new(f);

      let mp4 = mp4::Mp4Reader::read_header(m4a_buf, size).or(Err("Error reading mpeg header"))?;

      let m4a_reader = M4aSamplesReader::new(mp4)?;
      let decoder = aac_decoder::AacDecoder::new(m4a_reader).or(Err("Error decoding file"))?;

      // let buf = BufReader::new(f);
      // let decoder = aac_decoder::AacDecoder::new(buf)
      //   .or(Err("Error decoding file"))?;
      // let decoder = rodio::Decoder::new(buf)
      //   .or(Err("Error decoding file"))?;
      sink.append(decoder);
      sink.play();
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
