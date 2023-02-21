import { resolve } from 'path'
import { viteExternalsPlugin } from 'vite-plugin-externals'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess' // using vitePreprocess results in an error
// import { electronX } from 'vite-plugin-electron-x'
import electron from 'vite-plugin-electron'

export default defineConfig({
  base: './', // use relative paths
  clearScreen: false,
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: './build/web',
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    target: ['chrome64', 'edge79', 'firefox62', 'safari11.1'],
  },
  plugins: [
    viteExternalsPlugin({
      'ferrum-addon': 'ferrum-addon',
    }),
    svelte({
      preprocess: sveltePreprocess(),
    }),
    electron({
      entry: ['./src/electron/main.ts', './src/electron/preload.ts'],
      vite: {
        build: {
          outDir: './build/electron',
          rollupOptions: {
            external: [/^.*\.node$/],
          },
        },
      },
    }),
  ],
})
