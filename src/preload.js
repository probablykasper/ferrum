const path = require('path')
const fs = require('fs')
const { ipcRenderer } = require('electron')
const iTunesImport = require('./scripts/import_itunes.js')
window.addon = require('../native/addon.node')
const { ensureLibExists } = require('./scripts/handy.js')
const { tracksPath, libraryJsonPath } = require('./scripts/paths.js')
const { pathToFileURL } = require('url')

const { dialog, BrowserWindow } = require('electron').remote

window.showMessageBoxSync = (options) => {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  return dialog.showMessageBox(options)
}

window.toFileUrl = (...args) => {
  const combinedPath = path.join(...args)
  return pathToFileURL(combinedPath).href
}
window.existsSync = (path) => {
  return fs.existsSync(path)
}

let library = ensureLibExists()

let saving = 0
let gonnaQuit = false
window.readyToQuit = function() {
  if (gonnaQuit && saving === false) {
    ipcRenderer.send('readyToQuit')
  }
}
ipcRenderer.on('gonnaQuit', function(event) {
  gonnaQuit = true
  window.readyToQuit()
})

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
    saving++
    const timer = newTimer()

    const json = JSON.stringify(library, null, '  ')
    console.log('Stringify:', timer.reset())

    await addon.atomic_file_save(libraryJsonPath, json)
    console.log('Write Rust:', timer.reset())

    saving--
    window.readyToQuit()
  },
}
window.db = db

const { performance } = require('perf_hooks')
function newTimer() {
  let start = performance.now()
  return {
    reset: () => {
      const time = performance.now() - start
      start = performance.now()
      return time
    },
  }
}
