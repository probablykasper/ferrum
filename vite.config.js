import { defineConfig } from 'vite'
import svelte from '@svitejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess'

console.log('VITEPORT', process.env.PORT || 8089)
export default defineConfig({
  root: './src',
  base: './', // use relative paths
  publicDir: '../public',
  clearScreen: false,
  server: {
    port: process.env.PORT || 8089,
    strictPort: true,
    fsServe: {
      root: '../',
    },
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
