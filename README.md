<div align="center">
	<img src="assets/Logo%201024.png" width="80">
</div>
<h3 align="center">Ferrum</h3>
<p align="center">
	Music library and player
	<br/>
	<a href="https://github.com/probablykasper/ferrum/releases"><b>Download for Mac, Windows or Linux</b></a>
</p>

<br/>

![Screenshot](assets/screenshot.png)

## Dev instructions

### Get started

1. Install Node.js
2. Install Rust
3. Run `npm install`

### Structure

App (Electron)
- Source: `src/electron.js` and `src/electron/`
- Build output: `build/app/`

Web (the frontend)
- Source code: napi and `src/`
- Build output: `build/web/`

Napi (the native Rust backend)
- Source code: `src-native/`
- Build output: `ferrum-addon/addon.node`

### Commands
- `npm run dev`: Start app in dev mode
- `npm run dev-release`: Start app in dev mode (optimized)
- `npm run build`: Build
- `npm run lint`: Lint
- `npm run format`: Format

### Publish new version
1. Run `npm run check`
2. Update `CHANGELOG.md`
3. Run `npm version --no-git-tag <version>` to bump the version number
4. Create a git tag in the format `v#.#.#`
5. Add release notes to the generated GitHub release and publish it
