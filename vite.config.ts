import { resolve } from 'path'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess'
import { electronX } from 'vite-plugin-electron-x'

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
    svelte({
      preprocess: sveltePreprocess(),
    }),
    electronX({
      dev: {
        env: {
          NODE_ENV: 'development',
        },
      },
      main: {
        entry: './src/electron/main.ts',
        outDir: './build/electron',
      },
      preload: {
        entry: './src/electron/preload.ts',
        external: [resolve('./build/addon.node'), 'simple-plist'],
        outDir: './build/electron',
      },
    }),
  ],
})
