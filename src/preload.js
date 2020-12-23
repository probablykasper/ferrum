const path = require('path')
const fs = require('fs')
const { app, dialog } = require('electron').remote
const addon = window.require(path.resolve(__dirname, '../native/addon.node'))
window.addon = addon

const libraryPath = path.join(app.getPath('music'), 'Ferrum')
const libraryJsonPath = path.join(app.getPath('music'), 'Ferrum', 'library.json')
const db = {
  load: function() {
    if (fs.existsSync(libraryJsonPath)) {
      db.library = JSON.parse(fs.readFileSync(libraryJsonPath))
    } else {
      db.library = {
        version: 1,
        tracks: [
          {
            title: 'Junction Seven',
            artist: 'Muzzy',
            album: 'F Minor Factory EP',
            album_artist: 'Muzzy',
            duration: 305,
            genre: 'Drum & Bass',
            year: 2016,
            plays: 21,
            comments: 'Monstercat',
          },
        ],
        albums: [],
        playlists: [],
      }
      if (!fs.existsSync(libraryPath)) {
        fs.mkdirSync(libraryPath, { recursive: true })
      }
      fs.appendFileSync(libraryJsonPath, JSON.stringify(db.library, null, '  '))
    }
  },
  save: function() {
    fs.writeFileSync(libraryJsonPath, JSON.stringify(db.library, null, '  '))
  },
}

window.api = {
  db,
}
