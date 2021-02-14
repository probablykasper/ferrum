module.exports = {
  mac: process.platform === 'darwin',
  dev: process.env.NODE_ENV === 'development',
}
