# Ferrum

Ferrum is a music library client.

## Dev instructions

### ToDo
- Fix PlayTime id null bug
- Make it so when `root` is opened, sort.key is not `index`
- Reset sorting when new playlist is opened
- Write tags to files:
  - m4a/aac: https://github.com/Saecki/rust-mp4ameta
  - mp3/mp3: https://github.com/polyfloyd/rust-id3
- Check if a track is VBR. Can we use codecProfile? What about non-mp3s?
- Look into playing audio from Rust to reduce CPU usage
- iTunes Import overwrites library, but old track/artwork files are still kept. Either move or delete them
- Volume normalization
- Databases
  - https://github.com/TheNeikos/rustbreak
  - https://github.com/spacejam/sled
  - https://github.com/Owez/tinydb
- Gapless audio
  - https://github.com/RustAudio/rodio
  - https://github.com/regosen/Gapless-5
  - https://github.com/sudara/stitches
  - https://www.npmjs.com/package/gapless.js

### Get started

1. Install Node.js (v12 works)
2. Install Rust (v1.48 works)
3. Run `npm install`

### Commands

#### `npm run start`
Start Electron + dev server with HMR, using Nollup.
#### `npm run build:ui`
Build UI into `public`, then the app into `dist`
#### `npm run serve:ui`
Serve UI
#### `npm run lint`
Lint code

### `Library.json` structure
Note: This is just a mockup to show the structure of the file, and isn't actual in-use Typescript definitions.
```ts
type Library = {
  version: number
  tracks: {
    [key: ID]: Track
  }
  trackLists: {
    [key: ID]: TrackList
  }
  playTime: PlayTime[]
}

type ID = string
type Integer = number
type PercentInteger = Integer // 0-100
type MsSinceUnixEpoch = Integer
type Bytes = Integer
type Seconds = number
type Filename = string
type CountObject = {
  count: Integer
  fromDate: MsSinceUnixEpoch
  toDate: MsSinceUnixEpoch
}

type Track = {
  size: Bytes
  duration: Seconds
  bitrate: number
  sampleRate: number
  file: Filename
  dateModified: MsSinceUnixEpoch
  dateAdded: MsSinceUnixEpoch
  name?: string
  importedFrom?: string // like "itunes"
  originalId?: string // imported ID, like iTunes Persistent ID
  artist?: string
  composer?: string
  sortName?: string
  sortArtist?: string
  sortComposer?: string
  genre?: string
  rating?: PercentInteger
  year?: Integer
  bpm?: number
  comments?: string
  grouping?: string
  liked?: boolean
  disliked?: boolean
  disabled?: boolean
  compilation?: boolean
  albumName?: string
  albumArtist?: string
  sortAlbumName?: string
  sortAlbumArtist?: string
  trackNum?: Integer
  trackCount?: Integer
  discNum?: Integer
  discCount?: Integer
  dateImported?: MsSinceUnixEpoch
  playCount?: Integer
  plays?: MsSinceUnixEpoch[]
  playsImported?: CountObject[]
  skipCount?: Integer
  skips?: MsSinceUnixEpoch[]
  skipsImported?: CountObject[]
  volume?: PercentInteger
}

type TrackList = Playlist | Folder | Root
type TrackListID = string

type TrackListBase = {
  type: string
  name: string
  description?: string
  liked?: string
  disliked?: string
  importedFrom?: string // like "itunes"
  originalId?: string // imported ID, like iTunes Persistent ID
  dateImported?: MsSinceUnixEpoch
}

interface Playlist extends TrackListBase {
  type: 'playlist'
  tracks: ID[]
}

interface Folder extends TrackListBase {
  type: 'folder'
  children: TrackListID[]
}

type Root = {
   // has TrackListID "root"
  type: 'special'
  name: 'Root'
  dateCreated: MsSinceUnixEpoch
  children: TrackListID[]
}

interface Playlist extends TrackList {
  type: 'playlist'
}

type StartTime = MsSinceUnixEpoch
type DurationMs = number
type PlayTime = [ID, StartTime, DurationMs]
```

### Publish new version
1. Update `CHANGELOG.md`
2. Bump the `package.json` version number
    ```
    npm version --no-git-tag <version>
    ```
3. Manually bump the version number in `native/Cargo.toml`
4. Check for errors and bump the `Cargo.lock` version number
    ```
    cargo check --manifest-path native/Cargo.toml
    ```
5. Commit and tag in format "v#.#.#"
6. Build the app
    ```
    npm run build
    ```
7. Create GitHub release with release notes
