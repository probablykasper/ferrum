# Changelog

## Next
- Converted some code to Rust
- Errors will now show up as popups
- Fixed error when opening a smaller playlist than what's currently visible
- Fixed some play times being incorrectly logged with `null` values
- Fixed play times often being logged with too big durations. For play times already logged incorrectly, run the script `src/scripts/fix_play_time.js` to fix those.
- Fixed `tracks` and `playlists` properties of playlists missing during iTunes import.

## 0.2.0 - 2021 Jan 3
- Added currently playing artist and title to player
- Added sorting
- Added macOS traffic light to window
- Removed shortcut for importing iTunes library
- Fixed album names not showing up
- Fixed play time sometimes being incorrectly logged
- Fixed empty tracklist when opening playlist while scrolled down

## 0.1.0 - 2021 Dec 31
- Initial release
