const path = require('path')
const fs = require('fs')
const iTunesImport = require('./import_itunes.js')
window.addon = require('../../native/addon.node')
const { pathToFileURL } = require('url')

const { dialog } = require('electron').remote

window.showMessageBoxSync = (options) => {
  return dialog.showMessageBoxSync(options)
}

window.toFileUrl = (...args) => {
  const combinedPath = path.join(...args)
  return pathToFileURL(combinedPath).href
}
window.existsSync = (path) => {
  return fs.existsSync(path)
}

window.iTunesImport = iTunesImport
