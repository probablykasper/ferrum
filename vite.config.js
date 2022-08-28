import path from 'path'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess'

export default defineConfig({
  root: './src',
  base: './', // use relative paths
  // publicDir: '../public',
  clearScreen: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: process.env.PORT || 8089,
    strictPort: true,
    fsServe: {
      root: '../',
    },
  },
  build: {
    outDir: '../build/web',
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    target: ['chrome64', 'edge79', 'firefox62', 'safari11.1'],
  },
  plugins: [
    svelte({
      preprocess: sveltePreprocess(),
    }),
  ],
})
