import { resolve } from 'path'
import { exec } from 'child_process'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess'

export default defineConfig({
  root: './src',
  base: './', // use relative paths
  clearScreen: false,
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.PORT) || 8089,
    strictPort: true,
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
    {
      name: 'electron-start',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          console.log('\nStarting Electron...')
          const child = exec('NODE_ENV=development electron .')
          child.stdout?.pipe(process.stdout)
          child.stderr?.pipe(process.stderr)
        })
      },
    },
  ],
})
