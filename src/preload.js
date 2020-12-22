const path = require('path')
const addon = window.require(path.resolve(__dirname, '../native/index.node'))
window.addon = addon
