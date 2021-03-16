# Ferrum

Ferrum is a music library client.

## Dev instructions

### ToDo

- Arrow up/down to move selection
- Write tags to files:
  - m4a/aac: https://github.com/Saecki/rust-mp4ameta
  - mp3/mp3: https://github.com/polyfloyd/rust-id3
  - audiotags
- iTunes Import overwrites library, but old track/artwork files are still kept. Either move or delete them
- Volume normalization
- For Windows version, we will want to save before system shutdown. Using `session-end` event might work, but to actually delay shutdown, see this: https://github.com/electron/electron/issues/8762
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

1. Install Node.js (v14 works)
2. Install Rust (v1.49 works)
3. Run `npm install`

### Commands

#### `npm run start`
Start dev server + Electron
#### `npm run build`
Build UI into `public/build/`, then app into `dist/`
#### `npm run snowpack:build`
Build UI into `public/build/`
#### `npm run lint`
Format code
#### `npm run check`
Check for compiler errors and unused css

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
