<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import { fade } from 'svelte/transition'
	import TrackList from './components/TrackList.svelte'
	import Player from './components/Player.svelte'
	import Sidebar from './components/Sidebar.svelte'
	import Queue from './components/Queue.svelte'
	import TrackInfo, { current_list } from './components/TrackInfo.svelte'
	import PlaylistInfoModal from './components/PlaylistInfo.svelte'
	import { queue_visible } from './lib/queue'
	import { ipc_listen, ipc_renderer } from '@/lib/window'
	import { import_tracks, type PlaylistInfo, methods } from './lib/data'
	import { play_pause } from './lib/player'
	import DragGhost from './components/DragGhost.svelte'
	import ItunesImport from './components/ItunesImport.svelte'
	import { modal_count } from './components/Modal.svelte'
	import QuickNav from './components/QuickNav.svelte'
	import { check_shortcut } from './lib/helpers'
	import ArtistList from './components/ArtistList.svelte'
	import { tracklist_actions } from './lib/page'
	import './lib/router'
	import Route from './lib/Route.svelte'
	import { navigate_back, navigate_forward } from './lib/router'

	ipc_renderer.invoke('app_loaded').catch(() => {
		ipc_renderer.invoke('showMessageBox', false, {
			type: 'error',
			message: 'Failed to signal app loading',
			detail: 'Graceful shutdown will not be possible.',
		})
	})

	async function open_import_dialog() {
		if ($modal_count !== 0) {
			return
		}
		let result = await ipc_renderer.invoke('showOpenDialog', false, {
			properties: ['openFile', 'multiSelections'],
			filters: [{ name: 'Audio', extensions: ['mp3', 'm4a', 'opus'] }],
		})
		if (!result.canceled && result.filePaths.length >= 1) {
			import_tracks(result.filePaths)
		}
	}
	ipc_renderer.on('import', open_import_dialog)
	onDestroy(() => {
		ipc_renderer.removeListener('import', open_import_dialog)
	})

	function toggle_queue() {
		$queue_visible = !$queue_visible
	}
	$: ipc_renderer.invoke('update:Show Queue', $queue_visible)
	ipc_renderer.on('Show Queue', toggle_queue)
	onDestroy(() => {
		ipc_renderer.removeListener('Show Queue', toggle_queue)
	})

	let droppable = false
	const allowed_mimes = ['audio/mpeg', 'audio/x-m4a', 'audio/ogg'] // mp3, m4a
	function get_file_paths(e: DragEvent): string[] {
		if (!e.dataTransfer) return []
		let valid_paths: string[] = []
		for (let i = 0; i < e.dataTransfer.files.length; i++) {
			const file = e.dataTransfer.files[i]
			if (allowed_mimes.includes(file.type)) {
				valid_paths.push(file.path)
			}
		}
		return valid_paths
	}
	function has_files(e: DragEvent): boolean {
		if (!e.dataTransfer) return false
		for (let i = 0; i < e.dataTransfer.items.length; i++) {
			const item = e.dataTransfer.items[i]
			if (item.kind === 'file' && allowed_mimes.includes(item.type)) {
				return true
			}
		}
		return false
	}
	function drag_enter_or_over(e: DragEvent) {
		droppable = has_files(e)
		if (droppable) {
			e.preventDefault()
		}
	}
	function drag_leave() {
		droppable = false
	}
	function drop(e: DragEvent) {
		e.preventDefault()
		droppable = false
		const valid_paths = get_file_paths(e)
		const paths = []
		for (const path of valid_paths) {
			paths.push(path)
		}
		import_tracks(paths)
	}
	function keydown(e: KeyboardEvent) {
		let el = e.target as HTMLAudioElement
		if (el && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
			if (e.key === ' ') {
				e.preventDefault()
				play_pause()
			}
		}
	}

	let show_itunes_import = false
	onDestroy(
		ipc_listen('itunesImport', () => {
			if ($modal_count === 0) {
				show_itunes_import = true
			}
		}),
	)

	let playlist_info: PlaylistInfo | null = null
	onDestroy(
		ipc_listen('context.playlist.edit', (_, id) => {
			const list = methods.getTrackList(id)
			if (list.type !== 'special' && $modal_count === 0) {
				playlist_info = {
					name: list.name,
					description: list.description || '',
					isFolder: list.type === 'folder',
					id: list.id,
					editMode: true,
				}
			}
		}),
	)
	onDestroy(
		ipc_listen('context.playlist.delete', async (_, id) => {
			const list = methods.getTrackList(id)
			const result = await ipc_renderer.invoke('showMessageBox', false, {
				type: 'info',
				message: `Delete the ${list.type} "${list.name}"?`,
				detail: list.type === 'folder' ? 'This will also delete all playlists inside.' : '',
				buttons: [`Delete`, 'Cancel'],
				defaultId: 0,
			})
			if (result.response === 0) {
				methods.deleteTrackList(id)
			}
		}),
	)
	onDestroy(
		ipc_listen('newPlaylist', (_, id, is_folder) => {
			playlist_info = {
				name: '',
				description: '',
				isFolder: is_folder,
				id: id,
				editMode: false,
			}
		}),
	)

	onDestroy(ipc_listen('Back', navigate_back))
	onDestroy(ipc_listen('Forward', navigate_forward))

	onMount(() => {
		tracklist_actions.focus()
	})
</script>

<svelte:window on:keydown={keydown} />
<svelte:head>
	<title>Ferrum</title>
</svelte:head>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<main
	on:dragenter|capture={drag_enter_or_over}
	on:keydown={(e) => {
		if (e.target) {
			if (check_shortcut(e, 'ArrowUp', { cmd_or_ctrl: true })) {
				e.preventDefault()
				ipc_renderer.invoke('volume_change', true)
			} else if (check_shortcut(e, 'ArrowDown', { cmd_or_ctrl: true })) {
				e.preventDefault()
				ipc_renderer.invoke('volume_change', false)
			}
		}
	}}
>
	<div class="meat">
		<Sidebar />
		<div class="flex size-full min-w-0 flex-col">
			<Route route="/playlist/:playlist_id" component={TrackList} />
			<Route route="/artists" component={ArtistList} />
		</div>
		{#if $queue_visible}
			<Queue />
		{/if}
	</div>
	<Player />
	{#if droppable}
		<!-- if the overlay is always visible, it's not possible to scroll while dragging tracks -->
		<div class="drag-overlay" transition:fade={{ duration: 100 }}>
			<h1>Drop files to import</h1>
		</div>
		<div
			class="dropzone"
			on:dragleave={drag_leave}
			on:drop={drop}
			on:dragover={drag_enter_or_over}
			role="dialog"
			aria-label="Drop files to import"
			aria-dropeffect="copy"
		/>
	{/if}
</main>

{#if $current_list}
	<TrackInfo />
{/if}
{#if playlist_info}
	<PlaylistInfoModal info={playlist_info} cancel={() => (playlist_info = null)} />
{/if}
{#if show_itunes_import}
	<ItunesImport cancel={() => (show_itunes_import = false)} />
{/if}
<QuickNav />

<DragGhost />

<style lang="sass">
	:global(:root)
		--cubic-out: cubic-bezier(0.33, 1, 0.68, 1)
		--player-bg-color: #17181c
		--text-color: #e6e6e6
		--drag-bg-color: #1e1f24
		--drag-line-color: #0083f5
		--empty-cover-bg-color: #2b2c31
		--empty-cover-color: #45464a
		--border-color: #333333
		--accent-1: #2e5be0
		--accent-2: #103fcb
		--icon-color: #e6e6e6
		--icon-highlight-color: #00ffff
		--titlebar-height: 22px
		--hue: 225
		--right-sidebar-width: 250px
	:global(html), :global(body)
		background-color: #0D1115
		height: 100%
		color-scheme: dark
	:global(body)
		position: relative
		width: 100%
		margin: 0
		box-sizing: border-box
		background-image: linear-gradient(150deg, hsl(var(--hue), 60%, 10%), hsl(var(--hue), 20%, 6%))
		color: var(--text-color)
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif
		user-select: none
	:global(h1), :global(h2), :global(h3)
		font-weight: 400
		margin: 0px
	:global(h4), :global(h5), :global(h6)
		font-weight: 600
		margin: 0px
	.dropzone, .drag-overlay
		position: fixed
		width: 100%
		height: 100%
		top: 0px
		left: 0px
	.drag-overlay
		display: flex
		align-items: center
		justify-content: center
		background-color: rgba(#10161e, 0.9)
		transition: all 100ms ease-in-out
	main
		height: 100%
		max-height: 100%
		display: flex
		flex-direction: column
	.meat
		position: relative
		height: 0px
		display: flex
		flex-direction: row
		flex-grow: 1
</style>
