/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    src: { url: '/' },
  },
  plugins: ['@snowpack/plugin-svelte', '@snowpack/plugin-typescript'],
  install: [],
  installOptions: {},
  devOptions: {
    port: 8080,
    open: 'none',
    output: 'stream', // disable clearing of terminal
  },
  buildOptions: {
    out: './public/build',
    sourceMaps: true,
    clean: true,
  },
  alias: {},
  experiments: {
    optimize: {
      entrypoints: ['src/main.js'],
      bundle: true,
      target: ['chrome64','es2017'],
    },
  },
}
if (process.env.NODE_ENV === 'development') {
  module.exports.mount = {
    src: { url: '/build' },
    public: { url: '/', static: true },
  }
}
