import { defineConfig } from 'vite'
import svelte from '@svitejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess'
import vars from './src/variables.mjs'

export default defineConfig({
  root: './src',
  base: './', // use relative paths
  publicDir: '../public',
  clearScreen: false,
  server: {
    port: vars.port,
    strictPort: true,
  },
  build: {
    outDir: '../build',
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    target: ['chrome64', 'edge79', 'firefox62', 'safari11.1'],
  },
  plugins: [
    svelte({
      preprocess: sveltePreprocess({
        pug: {
          pretty: true,
        },
      }),
    }),
  ],
})
