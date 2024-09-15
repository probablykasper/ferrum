<script lang="ts">
	import { onDestroy } from 'svelte'
	import { checkShortcut } from '../lib/helpers'
	import { ipcListen } from '@/lib/window'
	import fuzzysort from 'fuzzysort'
	import { page, trackListsDetailsMap, view_as_artists, view_as_songs } from '@/lib/data'
	import type { TrackListDetails, ViewAs } from '../../ferrum-addon/addon'
	import Modal from './Modal.svelte'
	import { special_playlists_nav } from './Sidebar.svelte'

	type Result = TrackListDetails & { view_as?: ViewAs }

	let value = ''
	let playlists: Result[] = []
	let show = false
	$: if (show) {
		playlists = get_playlists()
	}
	function get_playlists() {
		const playlists: Result[] = special_playlists_nav
		for (const playlist of Object.values($trackListsDetailsMap)) {
			if (playlist.kind === 'playlist' || playlist.kind === 'folder') {
				playlists.push(playlist)
			}
		}
		playlists.push({ id: 'root', name: 'Songs', kind: 'special', view_as: view_as_songs })
		playlists.push({ id: 'root', name: 'Artists', kind: 'special', view_as: view_as_artists })
		return playlists
	}

	let filteredItems = fuzzysort.go(value, playlists, { key: 'name', all: true })
	$: {
		filteredItems = fuzzysort.go(value, playlists, { key: 'name', all: true })
		clampIndex()
	}

	function selectInput(el: HTMLInputElement) {
		el.select()
	}

	let selectedIndex = 0

	function clampIndex() {
		selectedIndex = Math.max(0, Math.min(filteredItems.length - 1, selectedIndex))
	}
	$: listItems, clampIndex()
	let listItems: HTMLElement[] = []

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Tab') {
			e.preventDefault()
		} else if (checkShortcut(e, 'Escape')) {
			show = false
			value = ''
		} else if (checkShortcut(e, 'Enter')) {
			page.openPlaylist(
				filteredItems[selectedIndex].obj.id,
				filteredItems[selectedIndex].obj.view_as ?? view_as_songs,
			)
			show = false
		} else if (checkShortcut(e, 'ArrowUp')) {
			selectedIndex--
			clampIndex()
			listItems[selectedIndex].scrollIntoView({
				block: 'nearest',
			})
			e.preventDefault()
		} else if (checkShortcut(e, 'ArrowDown')) {
			selectedIndex++
			clampIndex()
			listItems[selectedIndex].scrollIntoView({
				block: 'nearest',
			})
			e.preventDefault()
		}
	}

	onDestroy(
		ipcListen('ToggleQuickNav', () => {
			show = !show
		}),
	)
</script>

{#if show}
	<Modal
		plain
		onCancel={() => {
			show = false
		}}
	>
		<input
			type="text"
			bind:value
			on:keydown={handleKeydown}
			placeholder="Search for a playlist..."
			use:selectInput
		/>
		<div class="items-container">
			{#each filteredItems as item, i}
				<button
					bind:this={listItems[i]}
					type="button"
					on:click={() => {
						page.openPlaylist(item.obj.id, item.obj.view_as ?? view_as_songs)
						show = false
					}}
					class:selected={selectedIndex === i}
				>
					{#if item.obj.kind === 'folder'}
						<svg
							style="padding: 1px"
							xmlns="http://www.w3.org/2000/svg"
							height="22px"
							viewBox="0 0 24 24"
							width="22px"
							fill="currentColor"
							><path d="M0 0h24v24H0V0z" fill="none" /><path
								d="M9.17 6l2 2H20v10H4V6h5.17M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
							/></svg
						>
					{:else}
						<svg
							style="transform: translateX(2px)"
							xmlns="http://www.w3.org/2000/svg"
							height="24px"
							viewBox="0 0 24 24"
							width="24px"
							fill="currentColor"
							><path
								d="M5 10h10c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm0-4h10c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm0 8h6c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm9 .88v4.23c0 .39.42.63.76.43l3.53-2.12c.32-.19.32-.66 0-.86l-3.53-2.12c-.34-.19-.76.05-.76.44z"
							/></svg
						>
					{/if}
					<span>{item.obj.name}</span>
				</button>
			{/each}
		</div>
	</Modal>
{/if}

<style lang="sass">
	.items-container
		width: 90vw
		max-width: 580px
		height: 300px
		max-height: 100%
	input
		font-size: inherit
		font-family: inherit
		padding: 16px 20px
		border-radius: 7px
		width: 100%
		box-sizing: border-box
		outline: none
		border: none
		background-color: transparent
		color: inherit
	.items-container
		border-top: 1px solid rgba(#ffffff, 0.08)
		padding: 8px
		scroll-padding: 8px
		overflow-y: auto
	button
		color: inherit
		font-size: inherit
		font-family: inherit
		background-color: inherit
		border: none
		display: flex
		align-items: center
		gap: 10px
		border-radius: 7px
		width: 100%
		padding: 10px
		&:hover
			background-color: rgba(#ffffff, 0.05)
		&.selected
			background-color: rgba(#ffffff, 0.15)
</style>
