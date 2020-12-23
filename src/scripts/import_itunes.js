const { dialog } = require('electron').remote
const fs = require('fs')
const simplePlist = require('simple-plist')

module.exports = async function(status) {
  // perhaps try...catch here
  return await doIt(status)
}

function readPlist(filePath) {
  return new Promise((resolve, reject) => {
    simplePlist.readFile(filePath, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}

async function doIt(status) {
  const filePaths = ['/Users/kasper/Downloads/Library.xml']
  // alert('Select an iTunes "Library.xml" file. To get that file, open iTunes and click on "File > Library > Export Library..."')
  // const filePaths = dialog.showOpenDialogSync({
  //   properties: ['openFile'],
  // })
  if (!filePaths || !filePaths[0]) return

  status('Reading iTunes Library file...')
  const xml = await readPlist(filePaths[0])

  status('Parsing iTunes Library file...')
  const warnings = []
  const errors = []
  const version = xml['Major Version']+'.'+xml['Minor Version']
  if (version !== '1.1') {
    warnings.push('Library.xml version: Expected 1.1, was '+version)
  }
  console.log('music folder:', xml['Music Folder'])

  status('Parsing tracks...')
  const tracks = []
  for (const key in xml.Tracks) {
    // restructure from object { 2192: track, ... } to [track, ...]
    if (Object.prototype.hasOwnProperty.call(xml.Tracks, key)) {
      tracks.push(xml.Tracks[key])
    }
  }
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i]
    status(`Parsing tracks... (${i+1}/${tracks.length})`)
  }


  console.log('xml:', xml)
  console.log('warnings:', warnings)
  console.log('errors:', errors)
  status('')
  return { warnings, errors }
}
