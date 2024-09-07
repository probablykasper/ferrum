import { resolve } from 'path'
import { defineConfig } from 'vite'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import electron from 'vite-plugin-electron'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: './build/web',
    sourcemap: true,
    target: 'chrome106',
  },
  plugins: [
    svelte({
      preprocess: vitePreprocess(),
    }),
    tailwindcss(),
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
