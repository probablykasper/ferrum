<script lang="ts">
	import commands from '$lib/commands'
	import { open } from '@tauri-apps/plugin-dialog'
	import type { LibraryTauri } from '../../bindings'
	import { readTextFile } from '@tauri-apps/plugin-fs'
	import Library from './Library.svelte'
	import { Store } from '@tauri-apps/plugin-store'

	let loading = $state(false)
	let error = $state('')

	const store = await Store.load('settings.json')
	let library = $state<LibraryTauri | null>(null)

	const saved_library_path = await store.get('library_path')
	if (typeof saved_library_path === 'string') {
		load_library(saved_library_path)
	}

	async function open_library() {
		const path = await open({
			filters: [{ name: 'JSON', extensions: ['json'] }],
		})
		if (path) {
			load_library(path)
		}
	}
	console.log(await store.entries())
	async function load_library(path: string) {
		loading = true
		library = null
		error = ''
		try {
			const contents = await readTextFile(path)
			const result = await commands.loadLibrary(contents)
			if (result.status === 'ok') {
				library = result.data
				store.set('library_path', path)
				store.save()
			} else {
				error = result.error
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load library'
		} finally {
			loading = false
		}
	}
</script>

<div
	class="flex h-screen flex-col overflow-hidden bg-white text-sm text-neutral-800 scheme-light-dark dark:bg-neutral-950 dark:text-neutral-200"
>
	{#if error}
		<div class="shrink-0 border-b border-red-900 bg-red-950 px-4 py-2.5 text-xs text-red-400">
			⚠ {error}
		</div>
	{/if}

	{#snippet open_button()}
		<button
			type="button"
			onclick={open_library}
			disabled={loading}
			class="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-100 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
		>
			{loading ? 'Loading…' : 'Open'}
		</button>
	{/snippet}

	{#if library}
		<Library {library} {open_button} />
	{:else}
		<div
			class="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center text-neutral-400 dark:text-neutral-700"
		>
			<span class="text-5xl">♪</span>
			<div>
				<p class="font-medium text-neutral-500 dark:text-neutral-500">No library loaded</p>
				<div class="mt-4">
					{@render open_button()}
				</div>
			</div>
		</div>
	{/if}
</div>
