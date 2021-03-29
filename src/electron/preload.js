const path = require('path')
const iTunesImport = require('./import_itunes.js')
window.addon = require('../../native/addon.node')
const { pathToFileURL } = require('url')

window.toFileUrl = (...args) => {
  const combinedPath = path.join(...args)
  return pathToFileURL(combinedPath).href
}

window.iTunesImport = iTunesImport
