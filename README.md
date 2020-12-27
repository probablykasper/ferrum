# Ferrum

ToDo:
- Load tracks from library into player
- Import albums, playlists
- Prevent duplicate IDs
- Metadata: Duration, Size
- Implement custom IDs
- Write tags to files:
  - m4a/aac: https://github.com/Saecki/rust-mp4ameta
  - mp3/mp3: https://github.com/polyfloyd/rust-id3
- Check if a track is VBR. Can we use codecProfile? What about non-mp3s?

Potential databases:
- https://github.com/TheNeikos/rustbreak
- https://github.com/spacejam/sled
- https://github.com/Owez/tinydb

Gapless audio:
- https://github.com/regosen/Gapless-5
- https://github.com/sudara/stitches
- https://www.npmjs.com/package/gapless.js

## Commands

### `npm run start`
Start Electron + dev server with HMR, using Nollup.

### `npm run build:ui`
Build UI into `public`, then the app into `dist`

### `npm run serve:ui`
Serve UI

### `npm run lint`
Lint code
