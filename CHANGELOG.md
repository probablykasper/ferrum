# Changelog

## Next
- Add `Escape` shortcut for deselecting tracks
- Add support selecting tracks via `Cmd+A`, `Shift+Up/Down`, `Alt+Up/Down`, `Shift+Alt+Up/Down`
- Improve behavior of shift-selecting tracks

## 0.8.1 - 2021 Aug 9
- Fix error after updating metadata when filter is on

## 0.8.0 - 2021 Aug 8
- Add support for Linux (deb/rpm) and Windows (exe)
- Add volume controls
- Add ability to create playlists
- Add track metadata editing
- Add playlist header
- Glowy fancy sidebar playlist highlight
- Some smaller design improvements
- Improve scrolling performance
- Make `space` shortcut work more often
- The `Ferrum/Artworks` folder is no longer necessary and can be safely deleted
- Breaking change: Make `library.json` track artist field required. Previously, this field was left out if it was empty

## 0.7.0 - 2021 May 14
- Add queue panel
- Add multi-selection support
- Add support for dragging/rearranging tracks
- Add ability to add tracks to playlists (via context menu)
- Ability to remove tracks from playlists via backspace or context menu (for now only possible when no filter or custom sorting is used)
- Change date added to show date instead of number timestamp
- Fix selection not clearing when page changes
- Fix reading metadata for some m4a files
- Fix row colors changing as you scroll
- Fix sorting icon not updating when switching to sorting by "index"
- Fix error popups not always triggering
- Fix "currently playing" icon showing incorrectly

## 0.6.1 - 2021 Apr 6
- Fix media keys shortcuts

## 0.6.0 - 2021 Apr 6
- Added filter feature
- Added artworks to player
- Design changes
- Fixed accessibility permisions flow

## 0.5.0 - 2021 Mar 24
- Added "Add to Queue" context menu item
- Added "Play Next" context menu item
- Make player prettier
- Added "currently playing" indicator icon in track list
- Added enter shortcut for playing selected track
- Added support for selecting tracks with up/down arrow keys

## 0.4.1 - 2021 Feb 19
- Fixed year metadata not being imported for mp3s using id3v2.4

## 0.4.0 - 2021 Feb 19
- Added support for importing mp3s
- Added support for exclusively taking over media keys
- Added mediaSession support
- Made library.json track `name` field required
- Changed the number types of some library.json track fields
- Fixed tracklist not refreshing after things change

## 0.3.0 - 2021 Feb 13
- Converted some code to Rust
- Errors will now show up as popups
- Fixed error when opening a smaller playlist than what's currently visible
- Fixed some play times being incorrectly logged with `null` values
- Fixed play times often being logged with too big durations. For play times already logged incorrectly, run the script `src/scripts/fix_play_time.js` to fix those
- Fixed `tracks` and `playlists` properties of playlists missing during iTunes import

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
