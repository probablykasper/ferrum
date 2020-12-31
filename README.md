# Ferrum

ToDo:
- Parse albums
- Show playlists
- Write tags to files:
  - m4a/aac: https://github.com/Saecki/rust-mp4ameta
  - mp3/mp3: https://github.com/polyfloyd/rust-id3
- Check if a track is VBR. Can we use codecProfile? What about non-mp3s?
- Look into playing audio from Rust to reduce CPU usage
- iTunes Import overwrites library, but old track/artwork files are still kept. Either move or delete them

Potential databases:
- https://github.com/TheNeikos/rustbreak
- https://github.com/spacejam/sled
- https://github.com/Owez/tinydb

Gapless audio:
- https://github.com/regosen/Gapless-5
- https://github.com/sudara/stitches
- https://www.npmjs.com/package/gapless.js

## Get started

1. Install Node.js (v12 works)
2. Install Rust (v1.48 works)
3. Run `npm install`

## Commands

### `npm run start`
Start Electron + dev server with HMR, using Nollup.

### `npm run build:ui`
Build UI into `public`, then the app into `dist`

### `npm run serve:ui`
Serve UI

### `npm run lint`
Lint code
