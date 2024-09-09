const dev_variable = (process.env.APP_ENV ?? process.env.NODE_ENV ?? '').toLowerCase()
export default {
  dev: dev_variable === 'dev' || dev_variable === 'development',
  mac: process.platform === 'darwin',
  windows: process.platform === 'win32',
}
