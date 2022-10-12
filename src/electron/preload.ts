import path from 'path'
import is from './is'
import addon from 'ferrum-addon'
import { iTunesImport } from './import_itunes'

window.addon = addon
window.isDev = is.dev
window.isMac = is.mac
window.isWindows = is.windows
window.iTunesImport = iTunesImport

window.joinPaths = (...args) => {
  const combinedPath = path.join(...args)
  return combinedPath
}
