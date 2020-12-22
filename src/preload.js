const path = require('path')
const addon = window.require(path.resolve(__dirname, '../native/addon.node'))
window.addon = addon
