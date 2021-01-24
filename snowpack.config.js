/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    src: { url: '/' },
  },
  plugins: ['@snowpack/plugin-svelte', '@snowpack/plugin-typescript'],
  devOptions: {
    port: 8080,
    open: 'none',
    output: 'stream', // disable clearing of terminal
  },
  buildOptions: {
    out: './public/build',
    sourcemap: true,
    clean: true,
  },
  alias: {},
  optimize: {
    entrypoints: ['src/main.js'],
    bundle: true,
    target: ['chrome64', 'es2020'],
  },
}
if (process.env.NODE_ENV === 'development') {
  module.exports.mount = {
    src: { url: '/build' },
    public: { url: '/', static: true },
  }
}
