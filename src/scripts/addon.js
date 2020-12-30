const addon = require('../../native/addon.node')

function wrapper(...args) {
  try {
    return addon.copy_file(...args)
  } catch(err) {
    if (!err.message) err.message = err.code
    throw err
  }
}

module.exports = {
  copy_file: wrapper,
}

// alternatively:
// for (const key in addon) {
//   if (!Object.prototype.hasOwnProperty.call(libTracks, key)) continue
//   module.exports[key] = wrapper
// }
