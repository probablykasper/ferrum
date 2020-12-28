const path = require('path')
const fs = require('fs')
const { app } = require('electron').remote
const addon = window.require(path.resolve(__dirname, '../native/addon.node'))
const iTunesImport = require('./scripts/import_itunes.js')
window.addon = addon
const { libraryPath, libraryJsonPath, tracksPath, ensureLibDirsExist } = require('./scripts/handy.js')

ensureLibDirsExist()

let library
if (fs.existsSync(libraryJsonPath)) {
  library = JSON.parse(fs.readFileSync(libraryJsonPath))
} else {
  library = {
    version: 1,
    tracks: [
      {
        name: 'Junction Seven',
        artist: 'Muzzy',
        album: 'F Minor Factory EP',
        albumArtist: 'Muzzy',
        duration: 305,
        genre: 'Drum & Bass',
        year: 2016,
        plays: 21,
        comments: 'Monstercat',
      },
    ],
    trackLists: [],
  }
  fs.appendFileSync(libraryJsonPath, JSON.stringify(library, null, '  '))
}

window.db = {
  iTunesImport: async function(...args) {
    return iTunesImport(...args)
  },
  get: function() {
    return library
  },
  save: function() {
    fs.writeFileSync(libraryJsonPath, JSON.stringify(library, null, '  '))
  },
}
