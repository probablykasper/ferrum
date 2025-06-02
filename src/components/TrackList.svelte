<script lang="ts" context="module">
	export const sort_key = writable('index')
	export const sort_desc = writable(true)
	export let current_playlist_id = writable('')
	current_playlist_id.subscribe((id) => {
		// Cannot call get_default_sort_desc() here because it
		// would be called before addon gets initialized
		if (id === 'root') {
			sort_key.set('dateAdded')
			sort_desc.set(true)
		} else {
			sort_key.set('index')
			sort_desc.set(true)
		}
	})
	export const group_album_tracks = writable(true)
	export const tracks_page_item_ids = writable<TracksPage['itemIds']>([])
</script>

<script lang="ts">
	import {
		filter,
		move_tracks,
		remove_from_playlist,
		tracklist_updated,
		get_default_sort_desc,
		delete_tracks_with_item_ids,
		tracks_updated,
		get_tracks_page,
		get_track_ids,
		save_view_options,
		get_track_by_item_id,
		view_options,
	} from '@/lib/data'
	import { new_playback_instance, playing_id } from '../lib/player'
	import { get_duration, format_date, check_mouse_shortcut, check_shortcut } from '../lib/helpers'
	import { tracklist_actions } from '../lib/page'
	import { ipc_listen, ipc_renderer } from '../lib/window'
	import { onDestroy, onMount } from 'svelte'
	import { dragged } from '../lib/drag-drop'
	import * as dragGhost from './DragGhost.svelte'
	import VirtualListBlock, { scroll_container_keydown } from './VirtualListBlock.svelte'
	import type { ItemId, Track, TracksPage } from 'ferrum-addon/addon'
	import Cover from './Cover.svelte'
	import Header from './Header.svelte'
	import { writable } from 'svelte/store'
	import { SvelteSelection } from '@/lib/selection'
	import { get_flattened_tracklists, handle_selected_tracks_action } from '@/lib/menus'
	import type { SelectedTracksAction } from '@/electron/typed_ipc'
	import { VirtualGrid } from '@/lib/virtual-grid'

	let tracklist_element: HTMLDivElement

	export let params: { playlist_id: string }
	$: $current_playlist_id = params.playlist_id

	let tracks_page = get_tracks_page({
		playlistId: params.playlist_id,
		filterQuery: $filter,
		sortKey: $sort_key,
		sortDesc: $sort_desc,
		groupAlbumTracks: $group_album_tracks,
	})
	// eslint-disable-next-line no-constant-condition
	$: if ($tracklist_updated || $tracks_updated || true) {
		tracks_page = get_tracks_page({
			playlistId: params.playlist_id,
			filterQuery: $filter,
			sortKey: $sort_key,
			sortDesc: $sort_desc,
			groupAlbumTracks: $group_album_tracks,
		})
	}
	$: $tracks_page_item_ids = tracks_page.itemIds

	function handle_action(action: SelectedTracksAction) {
		if (selection.items.size === 0) {
			return
		} else if (action === 'Remove from Playlist') {
			remove_from_playlist($current_playlist_id, selection.items_as_array())
			return
		} else if (action === 'Delete from Library') {
			delete_tracks(selection.items_as_array())
		} else {
			handle_selected_tracks_action({
				action,
				track_ids: get_track_ids(selection.items_as_array()),
				all_ids: get_track_ids(tracks_page.itemIds),
				first_index: selection.find_first_index(),
			})
		}
	}

	const selection = new SvelteSelection(tracks_page.itemIds, {
		scroll_to({ index }) {
			tracklist_actions.scroll_to_index?.(index)
		},
		async on_contextmenu() {
			const action = await ipc_renderer.invoke('show_tracks_menu', {
				is_editable_playlist: tracks_page.playlistKind === 'playlist',
				queue: false,
				lists: get_flattened_tracklists(),
			})
			if (action !== null) {
				handle_action(action)
			}
		},
	})
	$: selection.update_all_items(tracks_page.itemIds)

	const track_action_unlisten = ipc_listen('selected_tracks_action', (_, action) => {
		if (tracklist_element.contains(document.activeElement)) {
			handle_action(action)
		}
	})
	onDestroy(track_action_unlisten)

	ipc_renderer.on('Group Album Tracks', (_, checked) => {
		group_album_tracks.set(checked)
	})

	function double_click(e: MouseEvent, index: number) {
		if (e.button === 0 && check_mouse_shortcut(e)) {
			play_row(index)
		}
	}
	async function delete_tracks(item_ids: ItemId[]) {
		const s = selection.items.size > 1 ? 's' : ''
		const result = await ipc_renderer.invoke('showMessageBox', false, {
			type: 'info',
			message: `Delete ${selection.items.size} song${s} from library?`,
			buttons: [`Delete Song${s}`, 'Cancel'],
			defaultId: 0,
		})
		if (result.response === 0) {
			delete_tracks_with_item_ids(item_ids)
		}
	}
	async function keydown(e: KeyboardEvent) {
		if (check_shortcut(e, 'Enter')) {
			let first_item_id = selection.find_first_index()
			if (first_item_id !== null) {
				play_row(first_item_id)
			} else if (!$playing_id) {
				play_row(0)
			}
		} else if (
			check_shortcut(e, 'Backspace') &&
			selection.items.size > 0 &&
			$filter === '' &&
			tracks_page.playlistKind === 'playlist'
		) {
			e.preventDefault()
			const s = selection.items.size > 1 ? 's' : ''
			const result = ipc_renderer.invoke('showMessageBox', false, {
				type: 'info',
				message: `Remove ${selection.items.size} song${s} from the list?`,
				buttons: ['Remove Song' + s, 'Cancel'],
				defaultId: 0,
			})
			if ((await result).response === 0) {
				remove_from_playlist(params.playlist_id, Array.from(selection.items))
			}
		} else if (check_shortcut(e, 'Backspace', { cmd_or_ctrl: true }) && $selection.size > 0) {
			e.preventDefault()
			handle_action('Delete from Library')
		} else {
			selection.handle_keydown(e)
			return
		}
		e.preventDefault()
	}

	function play_row(index: number) {
		const all_track_ids = get_track_ids(tracks_page.itemIds)
		new_playback_instance(all_track_ids, index)
	}

	let drag_line: HTMLElement
	let drag_item_ids: ItemId[] = []
	function on_drag_start(e: DragEvent) {
		if (e.dataTransfer) {
			drag_item_ids = Array.from(selection.items)
			e.dataTransfer.effectAllowed = 'move'
			if (drag_item_ids.length === 1) {
				const { track } = get_track_by_item_id(drag_item_ids[0])
				dragGhost.set_inner_text(track.artist + ' - ' + track.name)
			} else {
				dragGhost.set_inner_text(drag_item_ids.length + ' items')
			}
			dragged.tracks = {
				ids: get_track_ids(drag_item_ids),
				playlist_indexes: drag_item_ids,
			}
			e.dataTransfer.setDragImage(dragGhost.drag_el, 0, 0)
			e.dataTransfer.setData('ferrum.tracks', '')
		}
	}
	let drag_to_index: null | number = null
	function on_drag_over(e: DragEvent, index: number) {
		if (
			!$sort_desc ||
			$sort_key !== 'index' ||
			$filter ||
			tracks_page.playlistKind !== 'playlist'
		) {
			drag_to_index = null
			return
		}
		if (
			dragged.tracks?.playlist_indexes &&
			e.currentTarget instanceof HTMLElement &&
			e.dataTransfer?.types[0] === 'ferrum.tracks'
		) {
			e.preventDefault()
			const rect = e.currentTarget.getBoundingClientRect()
			const container_rect = viewport.getBoundingClientRect()
			if (e.pageY < rect.bottom - rect.height / 2) {
				const top = rect.top - container_rect.top + viewport.scrollTop - 1
				drag_line.style.top = Math.max(0, top) + 'px'
				drag_to_index = index
			} else {
				const top = rect.bottom - container_rect.top + viewport.scrollTop - 1
				const max_top = viewport.scrollHeight - 2
				drag_line.style.top = Math.min(max_top, top) + 'px'
				drag_to_index = index + 1
			}
		}
	}
	async function drop_handler() {
		if (drag_to_index !== null) {
			move_tracks(params.playlist_id, drag_item_ids, drag_to_index)
			drag_to_index = null
		}
	}
	function drag_end_handler() {
		drag_to_index = null
	}

	function get_item(item_id: ItemId) {
		try {
			return get_track_by_item_id(item_id)
		} catch (_) {
			return { id: null, track: null }
		}
	}

	// let virtual_list: VirtualListBlock<ItemId>

	// $: if (virtual_list) {
	// 	virtual_list.refresh()
	// }

	let viewport: HTMLElement
	onMount(() => {
		// tracklist_actions.scroll_to_index = virtual_list.scroll_to_index
	})

	type Column = {
		name: string
		key: 'index' | 'image' | keyof Track
		width: number
		is_pct?: true
		offset?: number
	}
	const all_columns: Column[] = [
		// sorted alphabetically
		{ name: '#', key: 'index', width: 46 },
		// { name: 'Size', key: 'size' },
		{ name: 'Album', key: 'albumName', width: 0.9, is_pct: true },
		{ name: 'Album Artist', key: 'albumArtist', width: 0.9, is_pct: true },
		{ name: 'Artist', key: 'artist', width: 1.2, is_pct: true },
		// { name: 'Bitrate', key: 'bitrate' },
		{ name: 'BPM', key: 'bpm', width: 43 },
		{ name: 'Comments', key: 'comments', width: 0.65, is_pct: true },
		// { name: 'Compilation', key: 'compilation' },
		{ name: 'Composer', key: 'composer', width: 0.65, is_pct: true },
		{ name: 'Date Added', key: 'dateAdded', width: 140 },
		// { name: 'DateImported', key: 'dateImported' },
		// { name: 'DateModified', key: 'dateModified' },
		// { name: 'Disabled', key: 'disabled' },
		// { name: 'DiscCount', key: 'discCount' },
		// { name: 'DiscNum', key: 'discNum' },
		// { name: 'Disliked', key: 'disliked' },
		{ name: 'Time', key: 'duration', width: 50 },
		{ name: 'Genre', key: 'genre', width: 0.65, is_pct: true },
		{ name: 'Grouping', key: 'grouping', width: 0.65, is_pct: true },
		{ name: 'Image', key: 'image', width: 28 },
		// { name: 'ImportedFrom', key: 'importedFrom' },
		// { name: 'Liked', key: 'liked' },
		{ name: 'Name', key: 'name', width: 1.7, is_pct: true },
		{ name: 'Plays', key: 'playCount', width: 52 },
		// { name: 'Rating', key: 'rating' },
		// { name: 'SampleRate', key: 'sampleRate' },
		{ name: 'Skips', key: 'skipCount', width: 52 },
		// { name: 'Sort Album', key: 'sortAlbumName', width: 0.65, is_pct: true },
		// { name: 'Sort Album Artist', key: 'sortAlbumArtist', width: 0.65, is_pct: true },
		// { name: 'Sort Artist', key: 'sortArtist', width: 0.65, is_pct: true },
		// { name: 'Sort Composer', key: 'sortComposer', width: 0.65, is_pct: true },
		// { name: 'Sort Name', key: 'sortName', width: 0.65, is_pct: true },
		// { name: 'TrackCount', key: 'trackCount' },
		// { name: 'TrackNum', key: 'trackNum' },
		// { name: 'Volume', key: 'volume' },
		{ name: 'Year', key: 'year', width: 47 },
	]
	const default_columns: Column['key'][] = [
		'index',
		'image',
		'name',
		'playCount',
		'duration',
		'artist',
		'albumName',
		'comments',
		'genre',
		'dateAdded',
		'year',
	]
	let columns: Column[] = load_columns()
	onMount(() => {
		columns = load_columns()
	})
	function load_columns(): Column[] {
		let loaded_columns = view_options.columns
		if (loaded_columns.length === 0) {
			loaded_columns = [...default_columns]
		}
		const columns = loaded_columns
			.map((key) => all_columns.find((col) => col.key === key))
			.filter((col) => col !== undefined)
		const total_fixed_width = columns.reduce((sum, col) => sum + (col.is_pct ? 0 : col.width), 0)
		const total_percent_pct = columns.reduce((sum, col) => sum + (col.is_pct ? col.width : 0), 0)
		const container_width = tracklist_element?.clientWidth ?? total_fixed_width
		const total_percent_width = container_width - total_fixed_width
		let offset = 0
		return columns.map((col) => {
			col = { ...col }
			if (col.is_pct) {
				const pct = col.width / total_percent_pct
				col.width = pct * total_percent_width
			}
			col.offset = offset
			offset += col.width
			return col
		})
	}
	function save_columns() {
		view_options.columns = columns.map((col) => col.key)
		if (JSON.stringify(view_options.columns) === JSON.stringify(default_columns)) {
			view_options.columns = []
		}
		save_view_options(view_options)
	}
	function on_column_context_menu() {
		ipc_renderer.invoke('show_columns_menu', {
			menu: all_columns.map((col) => {
				return {
					id: col.key,
					label: col.name,
					type: 'checkbox',
					checked: !!columns.find((c) => c.key === col.key),
				}
			}),
		})
	}
	onDestroy(
		ipc_listen('context.toggle_column', (_, item) => {
			if (item.checked) {
				const column = all_columns.find((column) => column.key === item.id)
				if (column) {
					columns.push({ ...column })
					columns = columns
					save_columns()
				}
			} else {
				columns = columns.filter((column) => column.key !== item.id)
				save_columns()
			}
		}),
	)

	let col_container: HTMLElement
	let col_drag_line: HTMLElement
	let col_drag_index: number | null = null
	function on_col_drag_start(e: DragEvent, index: number) {
		if (e.dataTransfer) {
			col_drag_index = index
		}
	}
	let col_drag_to_index: null | number = null
	function on_col_drag_over(e: DragEvent, index: number) {
		if (col_drag_index !== null && e.currentTarget instanceof HTMLElement) {
			e.preventDefault()
			const rect = e.currentTarget.getBoundingClientRect()
			const container_rect = col_container.getBoundingClientRect()
			if (e.pageX < rect.right - rect.width / 2) {
				const offset = index === 0 ? 0 : -1
				col_drag_line.style.left = rect.left - container_rect.left + offset + 'px'
				col_drag_to_index = index
			} else {
				const offset = index === columns.length - 1 ? -2 : -1
				col_drag_line.style.left = rect.right - container_rect.left + offset + 'px'
				col_drag_to_index = index + 1
			}
		}
	}
	async function col_drop_handler() {
		if (col_drag_index !== null && col_drag_to_index !== null) {
			const move_to_left = col_drag_index < col_drag_to_index
			const removed_column = columns.splice(col_drag_index, 1)[0]
			columns.splice(col_drag_to_index - Number(move_to_left), 0, removed_column)
			columns = columns
			save_columns()

			col_drag_to_index = null
		}
	}
	function col_drag_end_handler() {
		col_drag_to_index = null
	}

	function get_row(e: Event) {
		if (!(e.target instanceof Element)) {
			return null
		}
		const row = e.target?.closest('[aria-rowindex]')
		const row_number = parseInt(row?.getAttribute('aria-rowindex') ?? '')
		if (!row || !Number.isInteger(row_number)) {
			return null
		}
		return {
			index: row_number - 1,
			element: row,
		}
	}

	const virtual_grid = new VirtualGrid<number>()
	$: virtual_grid.set_columns(columns)
	$: virtual_grid.set_items(tracks_page.itemIds)
	$: $selection, virtual_grid.refresh()
</script>

<Header
	title={params.playlist_id === 'root' ? 'Songs' : tracks_page.playlistName}
	subtitle="{tracks_page.itemIds.length} songs"
	description={tracks_page.playlistDescription}
/>
<div
	bind:this={tracklist_element}
	class="tracklist h-full"
	role="table"
	on:dragleave={() => (drag_to_index = null)}
>
	<!-- svelte-ignore a11y-interactive-supports-focus -->
	<div
		class="row table-header shrink-0 border-b border-b-slate-500/30"
		class:desc={$sort_desc}
		role="row"
		on:contextmenu={on_column_context_menu}
		on:dragleave={() => (col_drag_to_index = null)}
		bind:this={col_container}
	>
		{#each columns as column, i}
			<!-- svelte-ignore a11y-interactive-supports-focus -->
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div
				class="cell {column.key}"
				class:sort={$sort_key === column.key}
				style:width="{column.width}px"
				style:translate="{column.offset}px 0"
				role="button"
				on:click={() => {
					if (tracks_page.playlistKind === 'special' && column.key === 'index') {
						return
					} else if (column.key === 'image') {
						return
					}
					if ($sort_key === column.key) {
						sort_desc.set(!$sort_desc)
					} else {
						sort_key.set(column.key)
						sort_desc.set(get_default_sort_desc(column.key))
					}
				}}
				draggable="true"
				on:dragstart={(e) => on_col_drag_start(e, i)}
				on:dragend={col_drag_end_handler}
				on:dragover={(e) => on_col_drag_over(e, i)}
				on:drop={col_drop_handler}
			>
				<span>{column.key === 'image' ? '' : column.name}</span>
			</div>
		{/each}
		<div
			class="col-drag-line"
			class:hidden={col_drag_to_index === null}
			bind:this={col_drag_line}
		></div>
	</div>
	<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		bind:this={viewport}
		class="main-focus-element relative h-full overflow-y-auto outline-none"
		tabindex="0"
		on:mousedown|self={() => selection.clear()}
		on:keydown={scroll_container_keydown}
		on:keydown={keydown}
		on:mousedown={(e: MouseEvent) => {
			const row = get_row(e)
			if (row) {
				selection.handle_mousedown(e, row.index)
			}
		}}
		on:click={(e: MouseEvent) => {
			const row = get_row(e)
			if (row) {
				selection.handle_click(e, row.index)
			}
		}}
		on:dblclick={(e: MouseEvent) => {
			const row = get_row(e)
			if (row) {
				double_click(e, row.index)
			}
		}}
		on:contextmenu={(e: MouseEvent) => {
			const row = get_row(e)
			if (row) {
				selection.handle_contextmenu(e, row.index)
			}
		}}
	>
		<div
			{@attach virtual_grid.attach({
				row_setup(row, item, i) {
					row.classList.toggle('odd', i % 2 === 0)
					row.classList.toggle('selected', $selection.has(item))
				},
			})}
		>
			<div class="drag-line" class:hidden={drag_to_index === null} bind:this={drag_line}></div>
		</div>
	</div>
</div>

<style lang="sass">
	.tracklist :global
		.odd
			background-color: hsla(0, 0%, 90%, 0.06)
		.selected
			background-color: hsla(var(--hue), 20%, 42%, 0.8)
	:global(:focus) .tracklist :global, .main-focus-element:focus :global
		.selected
			background-color: hsla(var(--hue), 70%, 46%, 1)
	.tracklist :global
		display: flex
		flex-direction: column
		min-width: 0px
		width: 100%
		background-color: rgba(0, 0, 0, 0.01)
		overflow: hidden
		.row.table-header
			position: relative
			.c
				overflow: visible
				*
					pointer-events: none
			.c.sort span
				font-weight: 500
			.c.sort span::after
				content: '▲'
				padding-left: 1px
				transform: scale(0.8, 0.5)
				display: inline-block
			&.desc .c.sort span::after
				content: '▼'
		.row
			width: 100%
			$row-height: 24px
			height: $row-height
			font-size: 12px
			line-height: $row-height
			box-sizing: border-box
			position: absolute
			&.playing.selected
				color: #ffffff
			&.playing
				color: #00ffff
		.cell
			display: block
			position: absolute
			vertical-align: top
			width: 100%
			white-space: nowrap
			overflow: hidden
			text-overflow: ellipsis
			padding-left: 5px
			padding-right: 5px
			&:first-child
				padding-left: 10px
			&:last-child
				padding-right: 0px
			&.index, &.playCount, &.skipCount, &.duration
				padding-left: 0px
				padding-right: 10px
				text-align: right
				flex-shrink: 0
		.selected .index svg.playing-icon
			fill: var(--icon-color)
		.index
			width: 46px
			svg.playing-icon
				fill: #00ffff
				width: 16px
				height: 100%
		.image
			width: 18px
			flex-shrink: 0
			box-sizing: content-box
		.playCount, .skipCount
			width: 52px
		.duration
			width: 50px
		.dateAdded
			width: 140px
			flex-shrink: 0
			font-variant-numeric: tabular-nums
		.year
			width: 0px
			min-width: 47px
		.bpm
			width: 0px
			min-width: 43px
	.drag-line
		position: absolute
		width: 100%
		height: 2px
		background-color: var(--drag-line-color)
		pointer-events: none
	.col-drag-line
		position: absolute
		width: 2px
		height: 100vh
		background-color: var(--drag-line-color)
		pointer-events: none
		z-index: 5
</style>
