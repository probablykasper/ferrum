const addon = require('../../native/addon.node')

function wrapper(name) {
  const func = addon[name]
  return function(...args) {
    try {
      return func(...args)
    } catch(err) {
      if (!err.message) err.message = err.code
      throw err
    }
  }
}

module.exports = {
  copy_file: wrapper('copy_file'),
  atomic_file_save: wrapper('atomic_file_save'),
}
