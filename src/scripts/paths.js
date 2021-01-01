const path = require('path')
const electron = require('electron')

let app
if (electron.remote) app = electron.remote.app
else if (electron.app) app = electron.app
else throw new Error('No electron.app found')

const appData = app.getPath('appData')
const musicPath = app.getPath('music')

app.setName('Ferrum Dev')

const electronData = path.join(appData, app.name, 'Electron Data')
const libraryPath = path.join(musicPath, app.name)
const libraryJsonPath = path.join(libraryPath, 'library.json')
const tracksPath = path.join(libraryPath, 'Tracks')
const artworksPath = path.join(libraryPath, 'Artworks')

module.exports = {
  electronData,
  libraryPath,
  libraryJsonPath,
  tracksPath,
  artworksPath,
}

console.log(module.exports)
