const { dialog, BrowserWindow } = require('electron').remote
const simplePlist = require('simple-plist')
const path = require('path')
const url = require('url')
const fs = require('fs')
const mm = require('music-metadata')
const { tracksPath, artworksPath } = require('./paths.js')
const { generateFilename, ensureLibExists } = require('./handy.js')
const addon = require('../../native/addon.node')

module.exports = async function (status, warn) {
  const warnings = []
  try {
    result = await start(status, (warning) => {
      warnings.push(warning)
      warn(warning)
    })
    result.warnings = warnings
    return result
  } catch (err) {
    if (!err.message) err.message = err.code
    console.error(err)
    return { err, warnings }
  }
}

function readPlist(filePath) {
  return new Promise((resolve, reject) => {
    simplePlist.readFile(filePath, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}

function makeId(length = 10) {
  let result = ''
  const characters = 'abcdefghijklmnopqrstuvwxyz234567'
  const charactersLength = characters.length
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

function buffersEqual(buf1, buf2) {
  return Buffer.compare(buf1, buf2) === 0
}

async function popup() {
  m =
    'Select an iTunes "Library.xml" file. To get that file, open iTunes and click on "File > Library > Export Library..."' +
    '\n' +
    '\nWARNING: This will reset/delete your Ferrum library!' +
    // +"\nDuplicates will not be checked for, so if there's a song you already have in Ferrum, you'll end up with two."
    '\n' +
    '\nAll your tracks need to be downloaded for this to work.' +
    ' If you have tracks from iTunes Store/Apple Music, it might not work.' +
    '\n' +
    '\nThe following will not be imported:' +
    '\n- Music videos, podcasts, audiobooks, voice memos etc.' +
    '\n- Smart playlists, Genius playlists and Genius Mix playlists' +
    '\n- View options' +
    '\n- Album ratings, album likes and album dislikes' +
    '\n- The following track metadata:' +
    '\n    - Lyrics' +
    '\n    - Equalizer' +
    '\n    - Skip when shuffling' +
    '\n    - Remember playback position' +
    '\n    - Disc Count' +
    '\n    - Start time' +
    '\n    - Stop time'
  const focusedWindow = BrowserWindow.getFocusedWindow()
  const result = await dialog.showMessageBox(focusedWindow, {
    type: 'info',
    title: 'iTunes Import',
    message: m,
    checkboxLabel: 'Dry run',
    checkboxChecked: true,
    buttons: ['OK', 'Cancel'],
  })
  if (result.response === 1) return {}
  const filePaths = dialog.showOpenDialogSync(focusedWindow, {
    properties: ['openFile'],
  })
  if (filePaths && filePaths[0]) {
    return { filePath: filePaths[0], dryRun: result.checkboxChecked }
  }
  return {}
}

async function parseTrack(xmlTrack, warn, startTime, dryRun) {
  const track = {}
  const logPrefix = '[' + xmlTrack['Artist'] + ' - ' + xmlTrack['Name'] + ']'
  const REQUIRED = 1
  const RECOMMENDED = 2
  const addIfTruthy = function (prop, value, info) {
    if (value instanceof Date) {
      track[prop] = value.getTime()
    } else if (value) {
      track[prop] = value
    } else if (info === REQUIRED) {
      throw new Error(logPrefix + ` Track missing required field "${prop}"`)
    } else if (info === RECOMMENDED) {
      warn(logPrefix + ` Missing recommended field "${prop}"`)
    }
  }
  addIfTruthy('name', xmlTrack['Name'], RECOMMENDED)
  addIfTruthy('originalId', xmlTrack['Persistent ID'])
  track['importedFrom'] = 'itunes'
  addIfTruthy('artist', xmlTrack['Artist'], RECOMMENDED)
  addIfTruthy('composer', xmlTrack['Composer'])
  addIfTruthy('sortName', xmlTrack['Sort Name'])
  addIfTruthy('sortArtist', xmlTrack['Sort Artist'])
  addIfTruthy('sortComposer', xmlTrack['Sort Composer'])
  addIfTruthy('genre', xmlTrack['Genre'])
  addIfTruthy('rating', xmlTrack['Rating'])
  addIfTruthy('year', xmlTrack['Year'])
  addIfTruthy('bpm', xmlTrack['BPM'])
  addIfTruthy('dateModified', xmlTrack['Date Modified'], REQUIRED)
  addIfTruthy('dateAdded', xmlTrack['Date Added'], REQUIRED)
  track['dateImported'] = startTime
  addIfTruthy('comments', xmlTrack['Comments'])
  addIfTruthy('grouping', xmlTrack['Grouping'])
  if (xmlTrack['Play Count'] && xmlTrack['Play Count'] >= 1) {
    track['playCount'] = xmlTrack['Play Count']
    // Unlike "Skip Date" etc, "Play Date" is a non-UTC Mac HFS+ timestamp, but
    // luckily "Play Date UTC" is a normal date.
    let playDate = xmlTrack['Play Date UTC']
    let importedPlayCount = xmlTrack['Play Count']
    if (playDate !== undefined) {
      // if we have a playDate, add a play for it
      track['plays'] = [playDate.getTime()]
      importedPlayCount--
    }
    if (importedPlayCount >= 1) {
      track['playsImported'] = [
        {
          count: importedPlayCount,
          fromDate: xmlTrack['Date Added'].getTime(),
          toDate: playDate === undefined ? startTime : playDate.getTime(),
        },
      ]
    }
  }
  if (xmlTrack['Skip Count'] && xmlTrack['Skip Count'] >= 1) {
    track['skipCount'] = xmlTrack['Skip Count']
    let skipDate = xmlTrack['Skip Date']
    let importedSkipCount = xmlTrack['Skip Count']
    if (skipDate !== undefined) {
      // if we have a skipDate, add a skip for it
      track['skips'] = [skipDate.getTime()]
      importedSkipCount--
    }
    if (importedSkipCount >= 1) {
      track['skipsImported'] = [
        {
          count: importedSkipCount,
          fromDate: xmlTrack['Date Added'].getTime(),
          toDate: skipDate === undefined ? startTime : skipDate.getTime(),
        },
      ]
    }
  }
  // Play Time?
  //    Probably don't calculate play time from imported plays
  // Location (use to get file and extract cover)
  if (xmlTrack['Volume Adjustment']) {
    // In iTunes, you can choose volume adjustment at 10% increments. The XML
    // value Seems like it should go from -255 to 255. However, when set to
    // 100%, I got 255 on one track, but 254 on another. We'll just
    // convert it to a -100 to 100 range and round off decimals.
    const vol = Math.round(xmlTrack['Volume Adjustment'] / 2.55)
    if (vol && vol >= -100 && vol <= 100) {
      track['volume'] = vol
    } else {
      warn(logPrefix + ` Unable to import Volume Adjustment of value "${vol}"`)
    }
  }
  addIfTruthy('liked', xmlTrack['Loved'])
  addIfTruthy('disliked', xmlTrack['Disliked'])
  addIfTruthy('disabled', xmlTrack['Disabled'])

  if (xmlTrack['Compilation']) track.compilation = true
  if (xmlTrack['Album']) track.albumName = xmlTrack['Album']
  if (xmlTrack['Album Artist']) track.albumArtist = xmlTrack['Album Artist']
  if (xmlTrack['Sort Album']) track.sortAlbumName = xmlTrack['Sort Album']
  if (xmlTrack['Sort Album Artist']) track.sortAlbumArtist = xmlTrack['Sort Album Artist']

  if (xmlTrack['Track Number']) track.trackNum = xmlTrack['Track Number']
  if (xmlTrack['Track Count']) track.trackCount = xmlTrack['Track Count']
  if (xmlTrack['Disc Number']) track.discNum = xmlTrack['Disc Number']
  if (xmlTrack['Disc Count']) track.discCount = xmlTrack['Disc Count']

  if (xmlTrack['Track Type'] !== 'File') {
    const trackType = xmlTrack['Track Type']
    throw new Error(logPrefix + ` Expected track type "File", was "${trackType}"`)
  }
  if (!xmlTrack['Location']) {
    throw new Error(logPrefix + ' Missing required field "Location"')
  }
  const xmlTrackPath = url.fileURLToPath(xmlTrack['Location'])
  if (!fs.existsSync(xmlTrackPath)) {
    throw new Error(logPrefix + ' File does not exist')
  }
  const stats = fs.statSync(xmlTrackPath)
  track.size = stats.size

  const md = await mm.parseFile(xmlTrackPath)
  // Warnings are in md.quality.warnings
  if (!md.format.duration) {
    throw new Error(
      logPrefix + ' Could not read duration from file. Probably unusual or badly encoded file'
    )
  }
  if (!md.format.bitrate) {
    throw new Error(
      logPrefix + ' Could not read bitrate from file. Probably unusual or badly encoded file'
    )
  }
  if (!md.format.sampleRate) {
    throw new Error(
      logPrefix + ' Could not read sample rate from file. Probably unusual or badly encoded file'
    )
  }
  track.duration = md.format.duration
  track.bitrate = Math.round(md.format.bitrate)
  track.sampleRate = md.format.sampleRate
  const picture = md.common.picture
  const newFilename = generateFilename(track, xmlTrackPath)
  track.file = newFilename
  let artworkPath, artworkData
  if (picture && picture[0]) {
    // if the track has multiple artworks, check if if they're equal. If
    // yes, use the first one, otherwise warn
    if (picture.length > 1) {
      // Start at 1 since we're comparing two elements in the array
      for (let i = 1; i < picture.length; i++) {
        const equal = buffersEqual(picture[i - 1].data, picture[i].data)
        if (!equal) {
          warn(logPrefix + ' Found multiple unique artworks. Using the first one')
        }
      }
      // // this code is for writing the multiple artworks
      // if (!allEqual) {
      //   for (let i = 0; i < picture.length; i++) {
      //     let ext = '.jpg'
      //     if (picture[0].format === 'image/png') ext = '.png'
      //     const dir = path.join(libraryPath, 'Export', newFilename+' '+i+ext)
      //     fs.writeFileSync(dir, picture[i].data)
      //   }
      // }
    }
    const thePicture = picture[0]
    let ext = '.jpg'
    if (thePicture.format === 'image/png') ext = '.png'
    const imgFormat = thePicture.format
    if (!['image/jpeg', 'image/png'].includes(imgFormat)) {
      warn(logPrefix + ` Skipping unsupported cover format "${imgFormat}"`)
    }
    artworkPath = path.join(artworksPath, newFilename + ext)
    artworkData = thePicture.data
  }
  const newPath = path.join(tracksPath, newFilename)
  if (fs.existsSync(newPath)) {
    throw new Error(logPrefix + ' File already exists: ' + newPath)
  }
  if (fs.existsSync(artworkPath)) {
    throw new Error(logPrefix + ' File already exists: ' + artworkPath)
  }
  if (!dryRun) {
    if (artworkPath) fs.writeFileSync(artworkPath, artworkData)
    addon.copy_file(xmlTrackPath, newPath)
  }

  if (
    xmlTrack['Persistent ID'] === 'A7F64F85A799AA1C' || // init.seq
    xmlTrack['Persistent ID'] === '033D11C37D8F07CA' || // test track
    xmlTrack['Persistent ID'] === '7B468E51DD4EC3DB' // test track2
  ) {
    console.log(xmlTrack['Name'], { track, xmlTrack })
  }

  return track
}

function addCommonPlaylistFields(playlist, xmlPlaylist, startTime) {
  const addIfTruthy = function (prop, value) {
    if (value) playlist[prop] = value
  }
  if (!xmlPlaylist['Name']) {
    throw new Error('Playlist missing required field "Name":', xmlPlaylist)
  }
  playlist.name = xmlPlaylist['Name']
  addIfTruthy('description', xmlPlaylist['Description'])
  addIfTruthy('liked', xmlPlaylist['Loved'])
  addIfTruthy('disliked', xmlPlaylist['Disliked'])
  playlist.originalId = xmlPlaylist['Playlist Persistent ID']
  playlist.importedFrom = 'itunes'
  playlist.dateImported = startTime
}

async function start(status, warn) {
  // const filePath = '/Users/kasper/Downloads/Library.xml'
  // const dryRun = false
  const { filePath, dryRun } = await popup()
  if (!filePath) return { cancelled: true }
  ensureLibExists()

  status('Reading iTunes Library file...')
  const xml = await readPlist(filePath)

  status('Parsing iTunes Library file...')
  const version = xml['Major Version'] + '.' + xml['Minor Version']
  if (version !== '1.1') {
    warn(
      `Library.xml version: Expected 1.1, was ${version}. You might have a too new/old iTunes verison`
    )
  }
  console.log('xml:', xml)
  console.log('music folder:', xml['Music Folder'])

  status('Parsing tracks...')
  const xmlPlaylists = []
  let xmlMusicPlaylist
  for (const key of Object.keys(xml.Playlists)) {
    const xmlPlaylist = xml.Playlists[key]
    // skip invisible playlists (should just be the "Library" playlist)
    if (xmlPlaylist['Visible'] === false) continue
    // skip smart playlists
    if (xmlPlaylist['Smart Info']) continue
    if (xmlPlaylist['Distinguished Kind'] && xmlPlaylist['Distinguished Kind'] !== 1) {
      // ignore iTunes-generated playlists
      if (xmlPlaylist['Distinguished Kind'] === 4) {
        // but keep the Music playlist
        if (xmlMusicPlaylist) throw new Error('Found two iTunes-generated "Music" playlists')
        xmlMusicPlaylist = xmlPlaylist
      }
    } else {
      xmlPlaylists.push(xmlPlaylist)
    }
  }
  // We import the tracks that are in the "Music" playlist since xml.Tracks
  // contains podcasts, etc.
  const xmlMusicPlaylistItems = xmlMusicPlaylist['Playlist Items']
  const startTime = new Date().getTime()
  const parsedTracks = {}
  const trackIdMap = {}
  for (let i = 0; i < xmlMusicPlaylistItems.length; i++) {
    status(`Parsing tracks... (${i + 1}/${xmlMusicPlaylistItems.length})`)
    const xmlPlaylistItem = xmlMusicPlaylistItems[i]
    const iTunesId = xmlPlaylistItem['Track ID']
    const xmlTrack = xml.Tracks[iTunesId]
    const track = await parseTrack(xmlTrack, warn, startTime, dryRun)
    let id

    do {
      // prevent duplicate IDs
      id = makeId(7)
    } while (parsedTracks[id])
    parsedTracks[id] = track
    trackIdMap[iTunesId] = id
  }

  status('Parsing folders...')
  const parsedPlaylists = {
    root: {
      name: 'Root',
      type: 'special',
      dateCreated: startTime,
      children: [],
    },
  }
  const folderIdMap = {}
  for (const xmlPlaylist of xmlPlaylists) {
    if (xmlPlaylist['Folder'] !== true) continue
    const playlist = { type: 'folder', children: [] }
    addCommonPlaylistFields(playlist, xmlPlaylist, startTime)
    let id
    do {
      // prevent duplicate IDs
      id = makeId(7)
    } while (parsedPlaylists[id])
    parsedPlaylists[id] = playlist
    const itunesId = playlist.originalId
    folderIdMap[itunesId] = id
  }
  for (const xmlPlaylist of xmlPlaylists) {
    if (xmlPlaylist['Folder'] !== true) continue
    const itunesId = xmlPlaylist['Playlist Persistent ID']
    const id = folderIdMap[itunesId]
    const playlist = parsedPlaylists[id]
    const parentItunesId = xmlPlaylist['Parent Persistent ID']
    const parentId = folderIdMap[parentItunesId]
    if (parentId) {
      const parent = parsedPlaylists[parentId]
      if (!parent) {
        throw new Error(`Could not find folder of playlist "${playlist.name}"`)
      }
      parent.children.push(id)
    } else {
      parsedPlaylists.root.children.push(id)
    }
  }

  status('Parsing playlists...')
  for (const xmlPlaylist of xmlPlaylists) {
    if (xmlPlaylist['Folder'] === true) continue
    const playlist = { type: 'playlist', tracks: [] }
    addCommonPlaylistFields(playlist, xmlPlaylist, startTime)

    const parentItunesId = xmlPlaylist['Parent Persistent ID']
    const parentId = folderIdMap[parentItunesId]
    let id
    do {
      // prevent duplicate IDs
      id = makeId(7)
    } while (parsedTracks[id])

    if (parentId) {
      const parent = parsedPlaylists[parentId]
      if (!parent) {
        throw new Error(`Could not find folder of playlist "${playlist.name}"`)
      }
      parent.children.push(id)
    } else {
      parsedPlaylists.root.children.push(id)
    }
    if (xmlPlaylist['Playlist Items']) {
      for (const item of xmlPlaylist['Playlist Items']) {
        const itunesTrackId = item['Track ID']
        const trackId = trackIdMap[itunesTrackId]
        // skip podcasts etc by checking if it's in parsedTracks
        if (parsedTracks[trackId]) {
          playlist.tracks.push(trackId)
        }
      }
    }
    parsedPlaylists[id] = playlist
  }
  console.log('parsedPlaylists:', parsedPlaylists)

  status('')
  console.log('LIB', { tracks: parsedTracks, trackLists: parsedPlaylists })
  if (dryRun) return { cancelled: true }
  return {
    tracks: parsedTracks,
    trackLists: parsedPlaylists,
  }
}
