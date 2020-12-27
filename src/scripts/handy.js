const { app } = require('electron').remote
const path = require('path')
const fs = require('fs')
const url = require('url')

const libraryPath = path.join(app.getPath('music'), 'Ferrum')
const libraryJsonPath = path.join(app.getPath('music'), 'Ferrum', 'library.json')
const tracksPath = path.join(libraryPath, 'Tracks')

function sanitizeFilename(str) {
  str = str.replaceAll('/', '_')
  str = str.replaceAll('?', '_')
  str = str.replaceAll('<', '_')
  str = str.replaceAll('>', '_')
  str = str.replaceAll('\\', '_')
  str = str.replaceAll(':', '_')
  str = str.replaceAll('*', '_')
  str = str.replaceAll('"', '_')
  // prevent control characters:
  str = str.replaceAll('0x', '__')
  // Filenames can be max 255 bytes. We use 230 to give
  // margin for the fileNum and file extension.
  return str.substring(0, 230)
}

function generateFilename(track, originalPath) {
  const name = track.name || ''
  const artist = track.artist || ''
  const beginning = sanitizeFilename(artist+' - '+name)

  const ext = path.extname(originalPath)
  const allowedExt = ['.mp3', '.m4a']
  if (!allowedExt.includes(ext)) {
    // by having an approved set of file extensions, we avoid unsafe filenames:
    //    - Unix reserved filenames `.` and `..`
    //    - Windows reserved filenames `CON`, `PRN` etc.
    //    - Trailing `.` and ` `
    throw new Error(`Unsupported file extension "${ext}"`)
  }

  let fileNum = 0
  let ending = ''

  let filename
  for (let i = 0; i < 999; i++) {
    if (i === 500) {
      throw new Error('Already got 500 tracks with that artist and title')
    }
    filename = beginning+ending+ext
    const filepath = path.join(tracksPath, filename)
    if (fs.existsSync(filepath)) {
      fileNum++
      ending = ' '+fileNum
    } else {
      break
    }
  }
  return filename
}

module.exports = {
  libraryPath,
  libraryJsonPath,
  tracksPath,
  generateFilename,
}
