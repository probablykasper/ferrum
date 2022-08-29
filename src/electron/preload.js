/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const iTunesImport = require('./import_itunes.js')
window.addon = require('../../build/addon.node')

window.joinPaths = (...args) => {
  const combinedPath = path.join(...args)
  return combinedPath
}

window.iTunesImport = iTunesImport
