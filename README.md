<div align="center">
  <img src="assets/Logo%201024.png" width="80">
</div>
<h3 align="center">Ferrum</h3>
<p align="center">
  Music library and player
  <br/>
  <a href="https://github.com/probablykasper/ferrum/releases"><b>Download for Mac, Windows or Linux</b></a>
</p>

## ⚠️ Warning
Ferrum is in development and might get updates that no longer work with your library.

<br/>

![Screenshot](assets/screenshot.png)

## Dev instructions

### ToDo

- Playlist covers
- Make removing from playlists work when filter or sorting is used (rn, if you remove the first shown track, it would remove the first track in the playlist)
- iTunes Import overwrites library, but old track/artwork files are still kept. Either move or delete them
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

### Structure

App (Electron)
- Source: `src/electron.js` and `src/electron/`
- Build output: `build/app/`

Web (the frontend)
- Source code: napi and `src/`
- Build output: `build/web/`

Napi (the native Rust backend)
- Source code: `native/`
- Build output: `build/addon.node`

### Commands

Run app in dev mode (napi unoptimized):
```
npm run dev
```

Run app in dev mode (napi optimized):
```
npm run dev-release
```

Build app (optimized):
```
npm run build
```

Build web:
```
npm run build:web
```

Format code:
```
npm run lint
```

Run `svelte-check`:
```
npm run check
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
5. Commit with a tag in format "v#.#.#"
6. Wait for the GitHub workflow to finish successfully
7. Add release notes to the generated GitHub release and publish it
