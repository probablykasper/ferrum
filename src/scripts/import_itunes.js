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
    +'\n',
    +'\nThe following metadata for tracks will will not be imported:',
    +'\n- Lyrics',
    +'\n- Equalizer',
    +'\n- Skip when shuffling',
    +'\n- Remember playback position',
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
  addIfTruthy('name', xmlTrack['Name'])
  addIfTruthy('artist', xmlTrack['Artist'])
  addIfTruthy('composer', xmlTrack['Composer'])
  addIfTruthy('sortTitle', xmlTrack['Sort Name'])
  addIfTruthy('sortArtist', xmlTrack['Sort Artist'])
  addIfTruthy('sortComposer', xmlTrack['Sort Composer'])
  addIfTruthy('genre', xmlTrack['Genre'])
  // Duration (total time, ms)
  addIfTruthy('year', xmlTrack['Year'])
  addIfTruthy('bpm', xmlTrack['BPM'])
  addIfTruthy('dateModified', xmlTrack['Date Modified'], true)
  addIfTruthy('dateAdded', xmlTrack['Date Added'], true)
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
  // Location (use to get file and extract cover)
  // Volume Adjustment
  // Liked / Disliked
  //    Do I just add it as a property, or have it be a playlist, or both?

  const album = {}
  if (xmlTrack['Album']) album.name = xmlTrack['Album']
  if (xmlTrack['Album Artist']) album.artist = xmlTrack['Album Artist']
  if (xmlTrack['Sort Album']) album.sortName = xmlTrack['Sort Album']
  if (xmlTrack['Sort Album Artist']) album.sortArtist = xmlTrack['Sort Album Artist']
  if (xmlTrack['Compilation']) album.compilation = true
  // type: album / compilation / playlist / folder

  if (xmlTrack['Track Number']) album.trackNum = xmlTrack['Track Number']
  if (xmlTrack['Track Count']) album.trackCount = xmlTrack['Track Count']
  if (xmlTrack['Disc Number']) album.discNum = xmlTrack['Disc Number']
  if (xmlTrack['Disc Count']) album.discCount = xmlTrack['Disc Count']
  // Album rating if non-computed

  // COMMON
  //    name
  // PLAYLIST
  //    name
  //    description
  //    duration
  //    loved
  //    parent
  //    size
  //    folder?
  //    smart?
  // ALBUM
  //    name
  //    sort name
  //    track number/count
  //    disc number/count
  //    album artist
  //    sort album artist
  //    compilation

  if (
    xmlTrack['Track ID'] === 22056 // init.seq
      || xmlTrack['Track ID'] === 112726 // test track
      || xmlTrack['Track ID'] === 112776 // test track2
  ) {
    console.log(xmlTrack['Track ID'], xmlTrack['Name'], { album, track, xmlTrack })
  }

  return { track, album }
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
  const xmlMusicPlaylistItems = xmlMusicPlaylist['Playlist Items']
  const startTime = new Date().getTime()
  const tracks = []
  for (let i = 0; i < xmlMusicPlaylistItems.length; i++) {
    status(`Parsing tracks... (${i+1}/${xmlMusicPlaylistItems.length})`)
    const xmlPlaylistItem = xmlMusicPlaylistItems[i]
    const trackID = xmlPlaylistItem['Track ID']
    const xmlTrack = xml.Tracks[trackID]
    const { track, album } = parseTrack(xmlTrack, warn, startTime)
    tracks.push(track)
  }

  status('')
}
