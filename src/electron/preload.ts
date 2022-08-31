import path from 'path'
import is from './is'
import addon from '../../build/addon.node'
import { iTunesImport } from './import_itunes'

window.addon = addon
window.isDev = is.dev
window.isMac = is.mac
window.iTunesImport = iTunesImport

window.joinPaths = (...args) => {
  const combinedPath = path.join(...args)
  return combinedPath
}
