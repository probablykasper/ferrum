use fdk_aac::dec::{Decoder, DecoderError, Transport};
use rodio::Source;
use std::io::{Read, Seek};
use std::time::Duration;

pub struct AacDecoder<R>
where
  R: Read + Seek,
{
  reader: R,
  decoder: Decoder,
  current_frame_offset: i32,
  current_frame_data: Vec<i16>,
  old_aac_bufdata: Vec<u8>,
}

impl<R> AacDecoder<R>
where
  R: Read + Seek,
{
  pub fn new(reader: R) -> Result<AacDecoder<R>, R> {
    let decoder = Decoder::new(Transport::Adts);
    let aac_decoder = AacDecoder {
      reader: reader,
      decoder: decoder,
      current_frame_offset: 0,
      current_frame_data: Vec::new(),
      old_aac_bufdata: Vec::new(),
    };
    // aac_decoder.next();
    Ok(aac_decoder)
  }
  // pub fn into_inner(self) -> R {
  //   self.reader
  // }
}

impl<R> Source for AacDecoder<R>
where
  R: Read + Seek,
{
  fn current_frame_len(&self) -> Option<usize> {
    let frame_size: usize = self.decoder.decoded_frame_size();
    Some(frame_size)
  }
  fn channels(&self) -> u16 {
    let num_channels: i32 = self.decoder.stream_info().numChannels;
    num_channels as _
  }
  fn sample_rate(&self) -> u32 {
    let sample_rate: i32 = self.decoder.stream_info().sampleRate;
    sample_rate as _
  }
  fn total_duration(&self) -> Option<Duration> {
    None
  }
}

impl<R> Iterator for AacDecoder<R>
where
  R: Read + Seek,
{
  type Item = i16;

  fn next(&mut self) -> Option<i16> {
    if self.current_frame_offset == self.current_frame_data.len() as i32 {
      let mut pcm = [0; 4096];
      let result = match self.decoder.decode_frame(&mut pcm) {
        Err(DecoderError::NOT_ENOUGH_BITS) => {
          let old_bufdata = &mut self.old_aac_bufdata;
          let old_bufdata_len = old_bufdata.len();
          // println!("old_bufdata_len: {}", old_bufdata_len);
          let mut new_bufdata = vec![0; 4096 - old_bufdata_len];
          match self.reader.read(&mut new_bufdata) {
            Ok(_) => {}
            Err(_) => return None,
          }
          // println!("BUF old: {:?}", old_bufdata);
          // println!("BUF new: {:?}", new_bufdata);
          old_bufdata.extend(new_bufdata);
          let bufdata = old_bufdata;
          // println!("bufata len: {}", bufdata.len());
          let bytes_read = match self.decoder.fill(bufdata) {
            Ok(bytes_read) => bytes_read,
            Err(_) => return None,
          };
          self.old_aac_bufdata = bufdata[bytes_read..].to_vec();
          // println!("bytes read: {}", bytes_read);
          self.decoder.decode_frame(&mut pcm)
        }
        val => val,
      };
      println!("----- NEB check");
      match result {
        Ok(_) => {}
        Err(DecoderError::NOT_ENOUGH_BITS) => {
          println!("Not enough bits - probably EOF");
          return None;
        }
        Err(err) => {
          println!("DecoderError: {}", err);
          return None;
        }
      }
      println!("----- NEB pass");
      // println!("decoded_frame_size: {} ", self.decoder.decoded_frame_size());
      self.current_frame_data = pcm.to_vec();
      self.current_frame_offset = 0;
    }
    let value = self.current_frame_data[self.current_frame_offset as usize];
    self.current_frame_offset += 1;
    return Some(value);
  }
}
