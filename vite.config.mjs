import { resolve } from 'path'
import { defineConfig } from 'vite'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'
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
    sourcemap: true,
    target: 'chrome93',
  },
  plugins: [
    svelte({
      preprocess: vitePreprocess(),
    }),
    electron({
      entry: ['./src/electron/main.ts', './src/electron/preload.ts'],
      vite: {
        build: {
          outDir: './build/electron',
          emptyOutDir: true,
          rollupOptions: {
            external: [/^.*\.node$/],
          },
        },
      },
    }),
  ],
})
