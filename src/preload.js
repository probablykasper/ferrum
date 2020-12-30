const path = require('path')
const fs = require('fs')
const { app } = require('electron').remote
const iTunesImport = require('./scripts/import_itunes.js')
const addon = require('./scripts/addon.js')
window.addon = addon
const { tracksPath, libraryJsonPath, ensureLibExists } = require('./scripts/handy.js')
const { pathToFileURL } = require('url')

let library = ensureLibExists()

const db = {
  iTunesImport: async function(...args) {
    return iTunesImport(...args)
  },
  get: function() {
    return library
  },
  getTrack: function(id) {
    return library.tracks[id]
  },
  addSkip: function(id) {
    const track = db.getTrack(id)
    if (!track.skipCount) track.skipCount = 0
    if (!track.skips) track.skips = []
    track.skipCount++
    track.skips.push(new Date().getTime())
    db.save()
  },
  addPlay: function(id) {
    const track = db.getTrack(id)
    if (!track.playCount) track.playCount = 0
    if (!track.plays) track.plays = []
    track.playCount++
    track.plays.push(new Date().getTime())
    db.save()
  },
  getTrackPath: function(id, fileUrl) {
    const trackPath = path.join(tracksPath, db.getTrack(id).file)
    if (fileUrl) return pathToFileURL(trackPath)
    else return trackPath
  },
  save: async function() {
    const { performance } = require('perf_hooks')
    const one = performance.now()

    const json = JSON.stringify(library, null, '  ')
    
    const two = performance.now()
    console.log('Stringify:', two-one)

    await fs.promises.writeFile(libraryJsonPath, json)

    const three = performance.now()
    console.log('Writefile:', three-two)
  },
}
window.db = db
