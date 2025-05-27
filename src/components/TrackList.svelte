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
	import type { ItemId, Track, TracksPage } from 'ferrum-addon/addon'
	import Cover from './Cover.svelte'
	import Header from './Header.svelte'
	import { writable } from 'svelte/store'
	import { SvelteSelection } from '@/lib/selection'
	import { get_flattened_tracklists, handle_selected_tracks_action } from '@/lib/menus'
	import type { SelectedTracksAction } from '@/electron/typed_ipc'
	import { defineCustomElement } from '@revolist/revogrid/standalone'
	import type { ColumnRegular } from '@revolist/revogrid'

	defineCustomElement()

	// let tracklist_element: HTMLDivElement

	export let params: { playlist_id: string }
	$: $current_playlist_id = params.playlist_id
	const item_height = 24

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

	// const track_action_unlisten = ipc_listen('selected_tracks_action', (_, action) => {
	// 	if (tracklist_element.contains(document.activeElement)) {
	// 		handle_action(action)
	// 	}
	// })
	// onDestroy(track_action_unlisten)

	ipc_renderer.on('Group Album Tracks', (_, checked) => {
		group_album_tracks.set(checked)
	})

	// function double_click(e: MouseEvent, index: number) {
	// 	if (e.button === 0 && check_mouse_shortcut(e)) {
	// 		play_row(index)
	// 	}
	// }
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
	function scroll_container_keydown(e: KeyboardEvent & { currentTarget: HTMLElement }) {
		let prevent = true
		const scroll_area = e.currentTarget.querySelector('.vertical-inner.scroll-rgRow')
		if (!scroll_area) return
		if (e.key === 'Home') scroll_area.scrollTop = 0
		else if (e.key === 'End') scroll_area.scrollTop = scroll_area.scrollHeight
		else if (e.key === 'PageUp') scroll_area.scrollTop -= scroll_area.clientHeight
		else if (e.key === 'PageDown') scroll_area.scrollTop += scroll_area.clientHeight
		else prevent = false
		if (prevent) e.preventDefault()
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

	// let drag_line: HTMLElement
	// let drag_item_ids: ItemId[] = []
	// function on_drag_start(e: DragEvent) {
	// 	if (e.dataTransfer) {
	// 		drag_item_ids = Array.from(selection.items)
	// 		e.dataTransfer.effectAllowed = 'move'
	// 		if (drag_item_ids.length === 1) {
	// 			const { track } = get_track_by_item_id(drag_item_ids[0])
	// 			dragGhost.set_inner_text(track.artist + ' - ' + track.name)
	// 		} else {
	// 			dragGhost.set_inner_text(drag_item_ids.length + ' items')
	// 		}
	// 		dragged.tracks = {
	// 			ids: get_track_ids(drag_item_ids),
	// 			playlist_indexes: drag_item_ids,
	// 		}
	// 		e.dataTransfer.setDragImage(dragGhost.drag_el, 0, 0)
	// 		e.dataTransfer.setData('ferrum.tracks', '')
	// 	}
	// }
	// let drag_to_index: null | number = null
	// function on_drag_over(e: DragEvent, index: number) {
	// 	if (
	// 		!$sort_desc ||
	// 		$sort_key !== 'index' ||
	// 		$filter ||
	// 		tracks_page.playlistKind !== 'playlist'
	// 	) {
	// 		drag_to_index = null
	// 		return
	// 	}
	// 	if (
	// 		dragged.tracks?.playlist_indexes &&
	// 		e.currentTarget instanceof HTMLElement &&
	// 		e.dataTransfer?.types[0] === 'ferrum.tracks'
	// 	) {
	// 		e.preventDefault()
	// 		const rect = e.currentTarget.getBoundingClientRect()
	// 		const container_rect = scroll_container.getBoundingClientRect()
	// 		if (e.pageY < rect.bottom - rect.height / 2) {
	// 			const top = rect.top - container_rect.top + scroll_container.scrollTop - 1
	// 			drag_line.style.top = Math.max(0, top) + 'px'
	// 			drag_to_index = index
	// 		} else {
	// 			const top = rect.bottom - container_rect.top + scroll_container.scrollTop - 1
	// 			const max_top = scroll_container.scrollHeight - 2
	// 			drag_line.style.top = Math.min(max_top, top) + 'px'
	// 			drag_to_index = index + 1
	// 		}
	// 	}
	// }
	// async function drop_handler() {
	// 	if (drag_to_index !== null) {
	// 		move_tracks(params.playlist_id, drag_item_ids, drag_to_index)
	// 		drag_to_index = null
	// 	}
	// }
	// function drag_end_handler() {
	// 	drag_to_index = null
	// }

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

	const all_columns: ColumnRegular[] = [
		// sorted alphabetically
		{ name: '#', prop: 'index', width_px: 46 },
		// { name: 'Size', prop: 'size' },
		{ name: 'Album', prop: 'albumName', width_pct: 0.9 },
		{ name: 'Album Artist', prop: 'albumArtist', width_pct: 0.9 },
		{ name: 'Artist', prop: 'artist', width_pct: 1.2 },
		// { name: 'Bitrate', prop: 'bitrate' },
		{ name: 'BPM', prop: 'bpm', width_px: 43 },
		{ name: 'Comments', prop: 'comments', width_pct: 0.65 },
		// { name: 'Compilation', prop: 'compilation' },
		{ name: 'Composer', prop: 'composer', width_pct: 0.65 },
		{ name: 'Date Added', prop: 'dateAdded', width_px: 140 },
		// { name: 'DateImported', prop: 'dateImported' },
		// { name: 'DateModified', prop: 'dateModified' },
		// { name: 'Disabled', prop: 'disabled' },
		// { name: 'DiscCount', prop: 'discCount' },
		// { name: 'DiscNum', prop: 'discNum' },
		// { name: 'Disliked', prop: 'disliked' },
		{ name: 'Time', prop: 'duration', width_px: 50 },
		{ name: 'Genre', prop: 'genre', width_pct: 0.65 },
		{ name: 'Grouping', prop: 'grouping', width_pct: 0.65 },
		{ name: 'Image', prop: 'image', width_px: 28 },
		// { name: 'ImportedFrom', prop: 'importedFrom' },
		// { name: 'Liked', prop: 'liked' },
		{ name: 'Name', prop: 'name', width_pct: 1.7 },
		{ name: 'Plays', prop: 'playCount', width_px: 52 },
		// { name: 'Rating', prop: 'rating' },
		// { name: 'SampleRate', prop: 'sampleRate' },
		{ name: 'Skips', prop: 'skipCount', width_px: 52 },
		// { name: 'Sort Album', prop: 'sortAlbumName', width_pct: 0.65 },
		// { name: 'Sort Album Artist', prop: 'sortAlbumArtist', width_pct: 0.65 },
		// { name: 'Sort Artist', prop: 'sortArtist', width_pct: 0.65 },
		// { name: 'Sort Composer', prop: 'sortComposer', width_pct: 0.65 },
		// { name: 'Sort Name', prop: 'sortName', width_pct: 0.65 },
		// { name: 'TrackCount', prop: 'trackCount' },
		// { name: 'TrackNum', prop: 'trackNum' },
		// { name: 'Volume', prop: 'volume' },
		{ name: 'Year', prop: 'year', width_px: 47 },
	]
	const default_columns: ('index' | 'image' | keyof Track)[] = [
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
	let container_el: HTMLElement
	let columns: ColumnRegular[] = load_columns()
	onMount(() => (columns = load_columns()))
	function load_columns(): ColumnRegular[] {
		let loaded_columns = view_options.columns
		if (loaded_columns.length === 0) {
			loaded_columns = [...default_columns]
		}
		const columns = loaded_columns
			.map((key) => all_columns.find((col) => col.prop === key))
			.filter((col) => col !== undefined)
		const total_fixed_width = columns.reduce((sum, col) => sum + (col.width_px || 0), 0)
		const total_percent_pct = columns.reduce((sum, col) => sum + (col.width_pct || 0), 0)
		const container_width = container_el?.clientWidth ?? total_fixed_width
		const total_percent_width = container_width - total_fixed_width
		return columns.map((col) => {
			const size_pct = col.width_pct / total_percent_pct
			const size = (col.width_px ?? size_pct * total_percent_width) || 0
			return {
				...col,
				name: col.name === 'Image' ? '' : col.name,
				size,
				columnProperties() {
					const classes: Record<string, boolean> = {}
					classes[col.prop] = true
					return {
						class: classes,
					}
				},
				cellProperties() {
					const classes: Record<string, boolean> = {}
					classes[col.prop] = true
					return {
						class: classes,
					}
				},
			}
		})
	}
	function save_columns() {
		view_options.columns = columns.map((col) => col.key)
		if (JSON.stringify(view_options.columns) === JSON.stringify(default_columns)) {
			view_options.columns = []
		}
		save_view_options(view_options)
	}
	// function on_column_context_menu() {
	// 	ipc_renderer.invoke(show_columns_menu', {
	// 		menu: all_columns.map((col) => {
	// 			return {
	// 				id: col.key,
	// 				label: col.name,
	// 				type: 'checkbox',
	// 				checked: !!columns.find((c) => c.key === col.key),
	// 			}
	// 		}),
	// 	})
	// }
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

	const grid = document.createElement('revo-grid')
	grid.setAttribute('theme', 'darkCompact')
	grid.readonly = true
	grid.rowSize = item_height
	grid.style.lineHeight = 'item_height' + 'px'
	grid.canFocus = false
	grid.resize = false
	grid.canDrag = false
	grid.canMoveColumns = false
	grid.hideAttribution = true
	grid.rowClass = 'row_class'
	$: grid.columns = columns
	$: tracks_data = tracks_page.itemIds
		.map((item_id, i) => {
			const track = get_item(item_id).track
			if (track === null) return null
			return {
				...track,
				item_id,
				duration: track.duration ? get_duration(track.duration) : '',
				dateAdded: format_date(track.dateAdded),
			}
		})
		.filter((track) => track !== null)
	$: grid.source = tracks_data.map((track, i) => {
		let row_class = ''
		if (i % 2 === 0) {
			row_class += 'odd'
		}
		return {
			...track,
			index: i + 1,
			row_class,
		}
	})

	onMount(() => {
		tracklist_actions.scroll_to_index = (index) => {
			const dummy = document.createElement('div')
			dummy.style.height = item_height + 'px'
			dummy.style.position = 'absolute'
			dummy.style.top = index * item_height + 'px'
			const scroll_area = grid.querySelector('.vertical-inner.scroll-rgRow')
			if (!scroll_area) {
				throw new Error('Scroll area not found')
			}
			// eslint-disable-next-line svelte/no-dom-manipulating
			scroll_area.prepend(dummy)
			dummy.scrollIntoView({ behavior: 'instant', block: 'nearest' })
			dummy.remove()
		}
	})

	$: $selection, apply_selection(selection)
	function apply_selection(selection: SvelteSelection<ItemId>) {
		const rows = grid.querySelectorAll('.rgRow')
		for (const row of rows) {
			const row_index = parseInt(row.getAttribute('data-rgrow') ?? '')
			if (Number.isInteger(row_index)) {
				const is_selected = selection.items.has(tracks_data[row_index].item_id)
				row.classList.toggle('selected', is_selected)
			} else {
				throw new Error(`Row index ${row_index} not integer`)
			}
		}
	}

	// let col_container: HTMLElement
	// let col_drag_line: HTMLElement
	// let col_drag_index: number | null = null
	// function on_col_drag_start(e: DragEvent, index: number) {
	// 	if (e.dataTransfer) {
	// 		col_drag_index = index
	// 	}
	// }
	// let col_drag_to_index: null | number = null
	// function on_col_drag_over(e: DragEvent, index: number) {
	// 	if (col_drag_index !== null && e.currentTarget instanceof HTMLElement) {
	// 		e.preventDefault()
	// 		const rect = e.currentTarget.getBoundingClientRect()
	// 		const container_rect = col_container.getBoundingClientRect()
	// 		if (e.pageX < rect.right - rect.width / 2) {
	// 			const offset = index === 0 ? 0 : -1
	// 			col_drag_line.style.left = rect.left - container_rect.left + offset + 'px'
	// 			col_drag_to_index = index
	// 		} else {
	// 			const offset = index === columns.length - 1 ? -2 : -1
	// 			col_drag_line.style.left = rect.right - container_rect.left + offset + 'px'
	// 			col_drag_to_index = index + 1
	// 		}
	// 	}
	// }
	// async function col_drop_handler() {
	// 	if (col_drag_index !== null && col_drag_to_index !== null) {
	// 		const move_to_left = col_drag_index < col_drag_to_index
	// 		const removed_column = columns.splice(col_drag_index, 1)[0]
	// 		columns.splice(col_drag_to_index - Number(move_to_left), 0, removed_column)
	// 		columns = columns
	// 		save_columns()

	// 		col_drag_to_index = null
	// 	}
	// }
	// function col_drag_end_handler() {
	// 	col_drag_to_index = null
	// }

	function get_row(e: Event) {
		if (!(e.target instanceof Element)) {
			return null
		}
		const row = e.target?.closest('[data-rgrow]')
		const row_index_str = parseInt(row?.getAttribute('data-rgrow') ?? '')
		if (!Number.isInteger(row_index_str)) {
			return null
		}
		return {
			index: row_index_str,
		}
	}
</script>

<Header
	title={params.playlist_id === 'root' ? 'Songs' : tracks_page.playlistName}
	subtitle="{tracks_page.itemIds.length} songs"
	description={tracks_page.playlistDescription}
/>
<svelte:window
	on:resize={() => {
		columns = load_columns()
	}}
/>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={container_el}
	class="grid-container grow"
	{@attach (element) => {
		element.appendChild(grid)
	}}
	onkeydown={(e) => {
		scroll_container_keydown(e)
		keydown(e)
	}}
	onmousedown={(e) => {
		if (e.target instanceof HTMLElement && e.target.tagName === 'REVOGR-VIEWPORT-SCROLL') {
			selection.clear()
			return
		}
		const row = get_row(e)
		if (row) {
			selection.handle_mousedown(e, row.index)
			setTimeout(() => {
				// Prevent cell focus
				grid.focus()
			})
			return
		}
	}}
></div>

<!-- <div
	bind:this={tracklist_element}
	class="tracklist h-full"
	role="table"
	on:dragleave={() => (drag_to_index = null)}
>
	<div
		class="row table-header border-b border-b-slate-500/30"
		class:desc={$sort_desc}
		role="row"
		on:contextmenu={on_column_context_menu}
		on:dragleave={() => (col_drag_to_index = null)}
		bind:this={col_container}
	>
		{#each columns as column, i}
			<div
				class="c {column.key}"
				class:sort={$sort_key === column.key}
				style:width={column.width}
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
	<div
		bind:this={scroll_container}
		class="main-focus-element relative h-full overflow-y-auto outline-none"
		tabindex="0"
	>
		<VirtualListBlock
			bind:this={virtual_list}
			items={tracks_page.itemIds}
			get_key={(item) => item}
			item_height={24}
			{scroll_container}
			let:item={item_id}
			let:i
			buffer={5}
		>
			{@const { id: track_id, track } = get_item(item_id)}
			{#if track !== null}
				<div
					class="row"
					role="row"
					on:dblclick={(e) => double_click(e, i)}
					on:contextmenu={(e) => selection.handle_contextmenu(e, i)}
					on:click={(e) => selection.handle_click(e, i)}
					draggable="true"
					on:dragstart={on_drag_start}
					on:dragover={(e) => on_drag_over(e, i)}
					on:drop={drop_handler}
					on:dragend={drag_end_handler}
					class:playing={track_id === $playing_id}
				>
					{#each columns as column}
						<div class="c {column.key}" style:width={column.width}>
							{#if column.key === 'index'}
								{#if track_id === $playing_id}
									<svg
										class="playing-icon inline"
										xmlns="http://www.w3.org/2000/svg"
										height="24"
										viewBox="0 0 24 24"
										width="24"
									>
										<path d="M0 0h24v24H0z" fill="none" />
										<path
											d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
										/>
									</svg>
								{:else}
									{i + 1}
								{/if}
							{:else if column.key === 'duration'}
								{track.duration ? get_duration(track.duration) : ''}
							{:else if column.key === 'dateAdded'}
								{format_date(track.dateAdded)}
							{:else if column.key === 'image'}
								<Cover {track} />
							{:else}
								{track[column.key] || ''}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</VirtualListBlock>
		<div class="drag-line" class:hidden={drag_to_index === null} bind:this={drag_line}></div>
	</div>
</div> -->

<style lang="sass">
	.grid-container :global revo-grid
			--revo-grid-focused-bg: hsla(var(--hue), 70%, 46%, 1)
			outline: none
			revogr-data, revogr-header
				.rgCell, .rgHeaderCell
					padding: 0 5px
					&:first-child
						padding-left: 10px
					&:last-child
						padding-right: 0px
					&.index, &.playCount, &.skipCount, &.duration
						padding-left: 0px
						padding-right: 10px
						text-align: right
						flex-shrink: 0
				.rgRow
					line-height: 24px
					font-size: 12px
					box-shadow: none
				.rgRow.odd
					background-color: hsla(0, 0%, 90%, 0.06)
				.rgRow.selected
					background-color: hsla(var(--hue), 20%, 42%, 0.8)
			revogr-header .header-rgRow
				height: 24px
				line-height: 24px
				font-size: 12px
				box-shadow: none
				font-weight: 400
			revogr-header .rgHeaderCell .resizable
				display: none
	.grid-container:focus-within :global revo-grid
		revogr-data .rgRow.selected
			background-color: hsla(var(--hue), 70%, 46%, 1)
	// .tracklist
	// 	display: flex
	// 	flex-direction: column
	// 	min-width: 0px
	// 	width: 100%
	// 	background-color: rgba(0, 0, 0, 0.01)
	// 	overflow: hidden
	// 	.table-header
	// 		.c
	// 			overflow: visible
	// 			*
	// 				pointer-events: none
	// 		.c.sort span
	// 			font-weight: 500
	// 		.c.sort span::after
	// 			content: '▲'
	// 			padding-left: 1px
	// 			transform: scale(0.8, 0.5)
	// 			display: inline-block
	// 		&.desc .c.sort span::after
	// 			content: '▼'
	// .row
	// 	display: flex
	// 	max-width: 100%
	// 	$row-height: 24px
	// 	height: $row-height
	// 	font-size: 12px
	// 	line-height: $row-height
	// 	box-sizing: border-box
	// 	position: relative
	// 	&.playing.selected
	// 		color: #ffffff
	// 	&.playing
	// 		color: #00ffff
	// .c
	// 	display: inline-block
	// 	vertical-align: top
	// 	width: 100%
	// 	white-space: nowrap
	// 	overflow: hidden
	// 	text-overflow: ellipsis
	// 	padding-left: 5px
	// 	padding-right: 5px
	// .selected .index svg.playing-icon
	// 	fill: var(--icon-color)
	// .index
	// 	svg.playing-icon
	// 		fill: #00ffff
	// 		width: 16px
	// 		height: 100%
	// .dateAdded
	// 	font-variant-numeric: tabular-nums
	// .drag-line
	// 	position: absolute
	// 	width: 100%
	// 	height: 2px
	// 	background-color: var(--drag-line-color)
	// 	pointer-events: none
	// .col-drag-line
	// 	position: absolute
	// 	width: 2px
	// 	height: 100vh
	// 	background-color: var(--drag-line-color)
	// 	pointer-events: none
	// 	z-index: 5
</style>
