module.exports = {
  dev: process.env.NODE_ENV === 'development',
  mac: process.platform === 'darwin',
  windows: process.platform === 'win32',
}
