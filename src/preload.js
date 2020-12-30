const path = require('path')
const fs = require('fs')
const { ipcRenderer } = require('electron')
const { app } = require('electron').remote
const iTunesImport = require('./scripts/import_itunes.js')
const addon = require('./scripts/addon.js')
window.addon = addon
const { tracksPath, libraryJsonPath, ensureLibExists } = require('./scripts/handy.js')
const { pathToFileURL } = require('url')

let library = ensureLibExists()

let saving = false
let saveQueued = false

let gonnaQuit = false
ipcRenderer.on('gonnaQuit', function(event) {
  gonnaQuit = true
})

let addedPlayTime = false
window.readyToQuit = function(status) {
  if (status === 'addedPlayTime') addedPlayTime = true
  if (gonnaQuit && addedPlayTime && saving === false) {
    ipcRenderer.send('readyToQuit')
  }
  console.log('notREADY TO QUIT', gonnaQuit, addedPlayTime, saving)
}

const db = {
  iTunesImport: async function(...args) {
    return iTunesImport(...args)
  },
  get: function() {
    return library
  },
  overwriteLibrary: function(newLib) {
    library = newLib
  },
  getTrack: function(id) {
    return library.tracks[id]
  },
  addSkip: async function(id) {
    const track = db.getTrack(id)
    if (!track.skipCount) track.skipCount = 0
    if (!track.skips) track.skips = []
    track.skipCount++
    track.skips.push(new Date().getTime())
    await db.save()
  },
  addPlay: async function(id) {
    const track = db.getTrack(id)
    if (!track.playCount) track.playCount = 0
    if (!track.plays) track.plays = []
    track.playCount++
    track.plays.push(new Date().getTime())
    await db.save()
  },
  addPlayTime: async function(id, startTime) {
    const duration = new Date().getTime() - startTime
    // don't bother if the track was played less than 1s
    if (duration >= 1000) {
      library.playTime.push([id, startTime, duration])
      await db.save()
    }
  },
  getTrackPath: function(id, fileUrl) {
    const trackPath = path.join(tracksPath, db.getTrack(id).file)
    if (fileUrl) return pathToFileURL(trackPath)
    else return trackPath
  },
  save: async function() {
    // prevent concurrency causing corrupt library
    if (saving) {
      saveQueued = true
      return
    }
    saving = true
    const { performance } = require('perf_hooks')
    const one = performance.now()

    const json = JSON.stringify(library, null, '  ')
    
    const two = performance.now()
    console.log('Stringify:', two-one)

    await fs.promises.writeFile(libraryJsonPath, json)

    const three = performance.now()
    console.log('Writefile:', three-two)
    saving = false
    if (saveQueued) {
      saveQueued = false
      await db.save()
    }
  },
}
window.db = db
