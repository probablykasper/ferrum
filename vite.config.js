import path from 'path'
import { defineConfig } from 'vite'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import electron from 'vite-plugin-electron'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	base: '/',
	clearScreen: false,
	resolve: {
		alias: {
			// These must also be specified in tsconfig.json
			$lib: path.resolve(import.meta.dirname, './src/lib'),
			$components: path.resolve(import.meta.dirname, './src/components'),
			$electron: path.resolve(import.meta.dirname, './src/electron'),
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
			entry: ['./src/electron/main.ts', './src/electron/preload.mts'],
			onstart({ startup }) {
				if (process.electronApp) {
					process.kill(process.electronApp.pid, 'SIGTERM')
				} else {
					startup()
				}
			},
			vite: {
				build: {
					target: 'chrome106',
					outDir: './build/electron',
					emptyOutDir: true,
					rollupOptions: {
						output: {
							format: 'esm',
							// https://github.com/electron-vite/vite-plugin-electron/blob/64feff264bea1ae8ce1cfd1a6f445e2416e7474d/src/simple.ts#L90
							entryFileNames: '[name].mjs',
							chunkFileNames: '[name].mjs',
							assetFileNames: '[name].[ext]',
						},
						external: [/^.*\.node$/],
					},
				},
			},
		}),
	],
})
