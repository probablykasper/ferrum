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

window.iTunesImport = iTunesImport

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
