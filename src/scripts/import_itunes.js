const { dialog } = require('electron').remote
const simplePlist = require('simple-plist')

module.exports = async function(status, warn) {
  const warnings = []
  try {
    result = await doIt(status, (warning) => {
      warnings.push(warning)
      warn(warning)
    })
    return { result, warnings: warnings }
  } catch(err) {
    console.error(err)
    return { err: err, warnings: warnings }
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

function getFilePath() {
  alert(
    'Select an iTunes "Library.xml" file. To get that file, open iTunes and click on "File > Library > Export Library..."'
    +'\n'
    +'\nMusic video, podcasts, audiobooks, voice memos etc will not be imported.',
  )
  const filePaths = dialog.showOpenDialogSync({
    properties: ['openFile'],
  })
  if (filePaths && filePaths[0]) filePaths[0]
}

function parseTrack(xmlTrack, warn, startTime) {
  const track = {}
  const addIfTruthy = function(prop, value, required) {
    if (value instanceof Date) {
      track[prop] = value.getTime()
    } else if (value) {
      track[prop] = value
    } else if (required) {
      throw new Error(`Track missing required field "${prop}": ${value}`)
    }
  }
  addIfTruthy('title', xmlTrack['Name'])
  addIfTruthy('artist', xmlTrack['Artist'])
  addIfTruthy('genre', xmlTrack['Genre'])
  // Duration (total time, ms)
  addIfTruthy('year', xmlTrack['Year'])
  addIfTruthy('bpm', xmlTrack['BPM'])
  addIfTruthy('dateModified', xmlTrack['Date Modified'], true)
  addIfTruthy('dateAdded', xmlTrack['Date Added'], true)
  track['dateImported'] = startTime
  addIfTruthy('comments', xmlTrack['Comments'])
  if (xmlTrack['Play Count'] && xmlTrack['Play Count'] >= 1) {
    track['playCount'] = xmlTrack['Play Count']
    // Unlike "Skip Date" etc, "Play Date" is a non-UTC Mac HFS+ timestamp, but
    // luckily "Play Date UTC" is a normal date.
    let playDate = xmlTrack['Play Date UTC']
    let importedPlayCount = xmlTrack['Play Count']
    if (playDate !== undefined) {
      // if we have a playDate, add a play for it
      track['plays'] = [ {
        date: playDate.getTime(),
        count: 1,
      } ]
      importedPlayCount--
    }
    if (importedPlayCount >= 1) {
      track['playsImported'] = [ {
        count: importedPlayCount,
        fromDate: xmlTrack['Date Added'].getTime(),
        toDate: playDate === undefined ? startTime : playDate.getTime(),
      } ]
    }
  }
  if (xmlTrack['Skip Count'] && xmlTrack['Skip Count'] >= 1) {
    track['skipCount'] = xmlTrack['Skip Count']
    let skipDate = xmlTrack['Skip Date']
    let importedSkipCount = xmlTrack['Skip Count']
    if (skipDate !== undefined) {
      // if we have a skipDate, add a skip for it
      track['skips'] = [ {
        date: skipDate.getTime(),
        count: 1,
      } ]
      importedSkipCount--
    }
    if (importedSkipCount >= 1) {
      track['skipsImported'] = [ {
        count: importedSkipCount,
        fromDate: xmlTrack['Date Added'].getTime(),
        toDate: skipDate === undefined ? startTime : skipDate.getTime(),
      } ]
    }
  }
  // Play Time?
  //    Probably don't calculate play time from imported plays
  addIfTruthy('album', xmlTrack['Album'])
  addIfTruthy('albumArtist', xmlTrack['Album Artist'])
  addIfTruthy('composer', xmlTrack['Composer'])
  // Track Number / Count
  // Disc Number / Count
  // Location (use to get file and extract cover)
  addIfTruthy('sortName', xmlTrack['Sort Name'])
  addIfTruthy('sortArtist', xmlTrack['Sort Artist'])
  addIfTruthy('sortAlbum', xmlTrack['Sort Album'])
  addIfTruthy('sortAlbumArtist', xmlTrack['Sort Album Artist'])
  addIfTruthy('sortComposer', xmlTrack['Sort Composer'])

  if (
    xmlTrack['Track ID'] === 22056 // init.seq
      || xmlTrack['Track ID'] === 112726 // test track
      || xmlTrack['Track ID'] === 112776 // test track2
  ) {
    console.log('Loc:', xmlTrack['Location'])
    console.log(xmlTrack['Track ID'], xmlTrack, track)
  }

  return track
}

async function doIt(status, warn) {
  const filePath = '/Users/kasper/Downloads/Library.xml'
  // const filePath = getFilePath()
  if (!filePath) return

  status('Reading iTunes Library file...')
  const xml = await readPlist(filePath)

  status('Parsing iTunes Library file...')
  const version = xml['Major Version']+'.'+xml['Minor Version']
  if (version !== '1.1') {
    warn(`Library.xml version: Expected 1.1, was ${version}. You might have a too new/old iTunes verison`)
  }
  console.log('xml:', xml)
  console.log('music folder:', xml['Music Folder'])


  status('Parsing tracks...')
  const xmlPlaylists = []
  let xmlMusicPlaylist
  for (const key of Object.keys(xml.Playlists)) {
    const xmlPlaylist = xml.Playlists[key]
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

  const startTime = new Date().getTime()
  const tracks = []
  const xmlMusicPlaylistItems = xmlMusicPlaylist['Playlist Items']
  for (let i = 0; i < xmlMusicPlaylistItems.length; i++) {
    status(`Parsing tracks... (${i+1}/${xmlMusicPlaylistItems.length})`)
    const xmlPlaylistItem = xmlMusicPlaylistItems[i]
    const trackID = xmlPlaylistItem['Track ID']
    const xmlTrack = xml.Tracks[trackID]
    const track = parseTrack(xmlTrack, warn, startTime)
    tracks.push(track)
  }

  status('')
}
