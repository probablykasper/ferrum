const fs = require('fs')

const green = '\033[32m'
const yellow = '\033[33m'
const reset = '\033[0m'

function prompt(msg, fallback) {
  return new Promise((resolve, reject) => {
    const stdin = process.openStdin()
    process.openStdin()
    process.stdout.write(msg + green)
    function listener(data) {
      process.stdout.write(reset)
      process.stdin.pause()
      const value = data.toString().trim()
      if (fallback && value === '') resolve(fallback)
      else resolve(value)
    }
    stdin.once('data', listener)
  })
}

main()
async function main() {
  console.log('Ferrum versions before 0.3 logged a lot of playTimes incorrectly.')
  console.log('This script fixes playTime values that are bigger than they should be.')

  console.log()
  const jsonPath = await prompt('library.json path: ')

  console.log()
  console.log('If you seek while playing a track, the playTime can exceed the track duration')
  console.log("which would be valid. It's also possible that a track's duration is slightly")
  console.log('slightly incorrect. To get around this, you can use a threshold above 0')
  console.log()
  const msThreshold = Number(await prompt('threshold in milliseconds (100): ', 100))
  if (msThreshold < 0 || msThreshold > 24 * 60 * 60 * 1000) {
    console.log('Invalid ms threshold')
    return
  }

  console.log()
  console.log('Consider backing up your library.json. Dry run will exit without making changes.')
  console.log()
  const dryRun = await prompt('Dry run (yes)? ')
  console.log()
  console.log('Excessive playtimes detected:')
  console.log('ID, Excessive playtime (secs), Track name')
  if (dryRun === 'no') {
    start(jsonPath, msThreshold, false)
  } else {
    start(jsonPath, msThreshold, true)
  }
}

function start(jsonPath, msThreshold, dryRun) {
  const json = fs.readFileSync(jsonPath)
  const library = JSON.parse(json)

  let ignoredCount = 0
  let tooLongCount = 0
  let validCount = 0
  for (const entry of library.playTime) {
    const [id, timestamp, timeListened] = entry
    const track = library.tracks[id]
    const duration = Math.round(1000 * track.duration)
    if (timeListened > duration + msThreshold) {
      const tooLong = (timeListened - duration) / 1000
      const tooLongPadded = yellow + String(tooLong).padEnd(11) + reset
      console.log(id, tooLongPadded, green + track.name + reset)
      if (dryRun === false) {
        entry[2] = duration
      }
      tooLongCount++
    } else if (timeListened > duration) {
      ignoredCount++
    } else {
      validCount++
    }
  }
  console.log()
  console.log(validCount, 'entries ok')
  console.log(ignoredCount, 'entries ignored due to threshold')
  console.log(tooLongCount, 'entries matched')

  console.log()
  if (dryRun) {
    console.log('Exiting without making any changes (dry run)')
  } else {
    console.log('Saving changes...')
    const json = JSON.stringify(library, null, '  ')
    fs.writeFileSync(jsonPath, json)
  }
}
