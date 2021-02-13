# Changelog

## Next
- **Migration**
  - The `playTime` key in `library.json` might have some values that include `null`. Remove these
  - The `playTime` key in `library.json` probably has a bunch of durations that are way too long. Run the script `src/scripts/fix_play_time.js` to fix this

## 0.2.0 - 2020 Jan 3
- **Migration**
  - There may have been breaking changes to `library.json`
- Added currently playing artist and title to player
- Added sorting
- Added macOS traffic light to window
- Removed shortcut for importing iTunes library
- Fixed album names not showing up
- Fixed play time sometimes being incorrectly logged
- Fixed empty tracklist when opening playlist while scrolled down

## 0.1.0 - 2020 Dec 31
- Initial release
