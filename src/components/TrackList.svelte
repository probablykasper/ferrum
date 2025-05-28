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
		paths,
	} from '@/lib/data'
	import { new_playback_instance, playing_id } from '../lib/player'
	import { get_duration, format_date, check_mouse_shortcut, check_shortcut } from '../lib/helpers'
	import { tracklist_actions } from '../lib/page'
	import { ipc_listen, ipc_renderer, join_paths } from '../lib/window'
	import { onDestroy, onMount } from 'svelte'
	import { dragged } from '../lib/drag-drop'
	import * as dragGhost from './DragGhost.svelte'
	import type { ItemId, Track, TracksPage } from 'ferrum-addon/addon'
	import Header from './Header.svelte'
	import { writable } from 'svelte/store'
	import { SvelteSelection } from '@/lib/selection'
	import { get_flattened_tracklists, handle_selected_tracks_action } from '@/lib/menus'
	import type { SelectedTracksAction } from '@/electron/typed_ipc'
	import { defineCustomElement } from '@revolist/revogrid/standalone'
	import type {
		BeforeRowRenderEvent,
		ColumnCollection,
		ColumnRegular,
		RevoGridCustomEvent,
	} from '@revolist/revogrid'

	defineCustomElement()

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

	const track_action_unlisten = ipc_listen('selected_tracks_action', (_, action) => {
		if (grid.contains(document.activeElement)) {
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
	function scroll_container_keydown(e: KeyboardEvent & { currentTarget: Element }) {
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
	function on_drag_over(e: DragEvent, element: Element, index: number) {
		if (
			!$sort_desc ||
			$sort_key !== 'index' ||
			$filter ||
			tracks_page.playlistKind !== 'playlist'
		) {
			drag_to_index = null
			return
		}
		const scroll_container = grid.querySelector('.vertical-inner.scroll-rgRow')
		if (
			dragged.tracks?.playlist_indexes &&
			e.currentTarget instanceof HTMLElement &&
			e.dataTransfer?.types[0] === 'ferrum.tracks' &&
			scroll_container
		) {
			e.preventDefault()
			const rect = element.getBoundingClientRect()
			const container_rect = scroll_container.getBoundingClientRect()
			if (e.pageY < rect.bottom - rect.height / 2) {
				const top = rect.top - container_rect.top + scroll_container.scrollTop - 1
				drag_line.style.top = Math.max(0, top) + 'px'
				drag_to_index = index
			} else {
				const top = rect.bottom - container_rect.top + scroll_container.scrollTop - 1
				const max_top = scroll_container.scrollHeight - 2
				drag_line.style.top = Math.min(max_top, top) + 'px'
				drag_to_index = index + 1
			}
		}
	}
	function drop_handler() {
		if (drag_to_index !== null) {
			move_tracks(params.playlist_id, drag_item_ids, drag_to_index)
			drag_to_index = null
		}
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

	let grid: HTMLRevoGridElement

	type ColumnRefined = ColumnRegular & { prop: string; left_offset: number }
	type ColumnDef = ColumnRegular & { prop: string } & (
			| {
					width_px: number
					width_pct?: undefined
			  }
			| {
					width_pct: number
					width_px?: undefined
			  }
		)
	const all_columns: ColumnDef[] = [
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
		{
			name: 'Image',
			prop: 'image',
			width_px: 28,

			cellTemplate(create_element, props) {
				const src = props.value
				return create_element('img', {
					src: src,
					class: 'invisible',
					onload(e: Event & { currentTarget: EventTarget & HTMLImageElement }) {
						if (src !== e.currentTarget.src) return
						const img = e.currentTarget
						img.classList.remove('invisible', 'error', 'missing')
						img.removeAttribute('title')
					},
					async onerror(e: Event & { currentTarget: EventTarget & HTMLImageElement }) {
						// Yes this is dumb, but there's no way to get an error code from <img src="" />
						const img = e.currentTarget
						if (src !== img.src) return
						img.classList.remove('invisible')
						img.removeAttribute('title')
						// 404 is an common expected result, so we start with that
						img.classList.add('error', 'missing')
						const new_error = await fetch(src)
							.then(async (response) => {
								if (response.status === 404) {
									return '404'
								}
								const response_text = await response.text()
								console.log(`Failed to load cover (${response.status}): ${response_text}`)
								return response_text
							})
							.catch(() => {
								return 'network'
							})
						if (src !== img.src) return
						img.classList.toggle('missing', new_error === '404')
						img.title = new_error
					},
					onmousedown(e: MouseEvent) {
						e.stopPropagation()
					},
					onclick(e: MouseEvent & { currentTarget: EventTarget & HTMLImageElement }) {
						const error = e.currentTarget.title
						if (e.currentTarget.classList.contains('error')) {
							ipc_renderer.invoke('showMessageBox', false, {
								type: 'error',
								message: 'Failed to load cover',
								detail: error,
							})
						}
					},
				})
			},
		},
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
	if (view_options.columns.length === 0) {
		view_options.columns = [...default_columns]
	}
	let columns: ColumnRefined[] = load_columns()
	onMount(() => (columns = load_columns()))
	function load_columns(): ColumnRefined[] {
		let loaded_columns = view_options.columns
		if (loaded_columns.length === 0) {
			loaded_columns = [...default_columns]
		}
		const columns = loaded_columns
			.map((key) => all_columns.find((col) => col.prop === key))
			.filter((col) => col !== undefined)
		const total_fixed_width = columns.reduce((sum, col) => sum + (col.width_px || 0), 0)
		const total_percent_pct = columns.reduce((sum, col) => sum + (col.width_pct || 0), 0)
		const container_width = grid?.clientWidth ?? total_fixed_width
		const total_percent_width = container_width - total_fixed_width
		let left_offset = 0
		return columns.map((col) => {
			let size: number
			if (col.width_px !== undefined) {
				size = col.width_px
			} else {
				size = (col.width_pct / total_percent_pct) * total_percent_width
			}
			const this_left_offset = left_offset
			left_offset += size
			return {
				...col,
				name: col.name === 'Image' ? '' : col.name,
				size,
				left_offset: this_left_offset,
				columnTemplate() {
					return null
				},
				columnProperties() {
					return { class: col.prop, draggable: true }
				},
				cellProperties() {
					return { class: col.prop, draggable: true }
				},
			}
		})
	}
	function save_columns() {
		view_options.columns = columns.map((col) => col.prop)
		if (JSON.stringify(view_options.columns) === JSON.stringify(default_columns)) {
			view_options.columns = []
		}
		save_view_options(view_options)
	}
	function on_column_context_menu() {
		ipc_renderer.invoke('show_columns_menu', {
			menu: all_columns.map((col) => {
				return {
					id: col.prop,
					label: col.name,
					type: 'checkbox',
					checked: !!columns.find((c) => c.prop === col.prop),
				}
			}),
		})
	}
	onDestroy(
		ipc_listen('context.toggle_column', (_, item) => {
			if (item.checked) {
				const column = all_columns.find((column) => column.prop === item.id)
				if (!column) {
					throw new Error('Tried to toggle non-existant column ' + item.id)
				}
				view_options.columns.push(column.prop)
				columns = load_columns()
				save_columns()
			} else {
				view_options.columns = view_options.columns.filter((column) => column !== item.id)
				columns = load_columns()
				save_columns()
			}
		}),
	)

	$: if (grid) grid.columns = columns
	$: source_rows = to_source_rows(tracks_page.itemIds)
	$: if (grid) grid.source = source_rows

	/** This is a function because we need it to be non-reactive */
	function to_source_rows(item_ids: ItemId[]) {
		return item_ids
			.map((item_id, i) => {
				const { track, id } = get_item(item_id)
				if (track === null) return null
				let row_class = ''
				if (i % 2 === 0) {
					row_class += 'odd'
				}
				if (selection.items.has(item_id)) {
					row_class += ' selected'
				}
				if (id === $playing_id) {
					row_class += ' playing'
				}
				return {
					...track,
					track_id: id,
					duration: track.duration ? get_duration(track.duration) : '',
					dateAdded: format_date(track.dateAdded),
					index: i + 1,
					image:
						'app://trackimg/?path=' +
						encodeURIComponent(join_paths(paths.tracksDir, track.file)) +
						'&cache_db_path=' +
						encodeURIComponent(paths.cacheDb) +
						'&date_modified=' +
						encodeURIComponent(track.dateModified),
					row_class: row_class.trim(),
				}
			})
			.filter((track) => track !== null)
	}

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

	$: if (grid && $selection) apply_selection()
	function apply_selection() {
		const rows = grid.querySelectorAll('.rgRow')
		for (const row of rows) {
			const row_index = parseInt(row.getAttribute('data-rgrow') ?? '')
			if (!Number.isInteger(row_index)) {
				throw new Error(`Row index ${row_index} not integer`)
			}
			const is_selected = selection.items.has(tracks_page.itemIds[row_index])
			row.classList.toggle('selected', is_selected)
		}
	}

	$: if (grid && $playing_id) apply_playing()
	function apply_playing() {
		const rows = grid.querySelectorAll('.rgRow')
		for (const row of rows) {
			const row_index = parseInt(row.getAttribute('data-rgrow') ?? '')
			if (!Number.isInteger(row_index)) {
				throw new Error(`Row index ${row_index} not integer`)
			}
			const id = source_rows[row_index].track_id
			row.classList.toggle('playing', id === $playing_id)
		}
	}

	function apply_classes() {
		apply_selection()
		apply_playing()
	}
	onMount(() => {
		// apply classes when scrolling and such
		grid.addEventListener('afterrender', apply_classes)
		return () => grid.removeEventListener('afterrender', apply_classes)
	})

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
			const scroll_container = grid.querySelector('.vertical-inner.scroll-rgRow')
			if (!scroll_container) {
				throw new Error('Scroll container not found')
			}
			const container_rect = scroll_container.getBoundingClientRect()
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
	function col_drop_handler() {
		if (col_drag_index !== null && col_drag_to_index !== null) {
			const move_to_left = col_drag_index < col_drag_to_index
			const removed_column = columns.splice(col_drag_index, 1)[0]
			columns.splice(col_drag_to_index - Number(move_to_left), 0, removed_column)
			save_columns()
			columns = load_columns()

			col_drag_to_index = null
		}
	}

	function get_row(e: Event) {
		if (!(e.target instanceof Element)) {
			return null
		}
		const row = e.target?.closest('[data-rgrow]')
		const row_index_str = parseInt(row?.getAttribute('data-rgrow') ?? '')
		if (!row || !Number.isInteger(row_index_str)) {
			return null
		}
		return {
			index: row_index_str,
			element: row,
		}
	}

	onMount(() => {
		grid.addEventListener('aftergridinit', tracklist_actions.focus)
		return () => grid.removeEventListener('aftergridinit', tracklist_actions.focus)
	})
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

<div class="grid-container relative flex grow flex-col">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="row grid-header border-b border-b-slate-500/30"
		class:desc={$sort_desc}
		role="row"
		oncontextmenu={on_column_context_menu}
		ondragleave={() => (col_drag_to_index = null)}
	>
		<div
			class="col-drag-line"
			class:hidden={col_drag_to_index === null}
			bind:this={col_drag_line}
		></div>
		{#each columns as column, i}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="rgCell {column.prop}"
				class:sort={$sort_key === column.prop}
				style:width="{column.size}px"
				style:translate="{column.left_offset}px 0"
				role="button"
				onclick={() => {
					if (tracks_page.playlistKind === 'special' && column.prop === 'index') {
						return
					} else if (column.prop === 'image') {
						return
					}
					if ($sort_key === column.prop) {
						sort_desc.set(!$sort_desc)
					} else {
						sort_key.set(column.prop)
						sort_desc.set(get_default_sort_desc(column.prop))
					}
				}}
				draggable="true"
				ondragstart={(e) => on_col_drag_start(e, i)}
				ondragend={() => (col_drag_to_index = null)}
				ondragover={(e) => on_col_drag_over(e, i)}
				ondrop={col_drop_handler}
			>
				{column.prop === 'image' ? '' : column.name}
			</div>
		{/each}
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<revo-grid
		bind:this={grid}
		class="main-focus-element grid grow"
		{@attach (grid: HTMLRevoGridElement) => {
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
		}}
		onkeydown={(e: KeyboardEvent & { currentTarget: Element }) => {
			scroll_container_keydown(e)
			keydown(e)
		}}
		onmousedown={(e: MouseEvent) => {
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
			}
		}}
		onclick={(e: MouseEvent) => {
			const row = get_row(e)
			if (row) {
				selection.handle_click(e, row.index)
			}
		}}
		ondblclick={(e: MouseEvent) => {
			const row = get_row(e)
			if (row) {
				double_click(e, row.index)
			}
		}}
		oncontextmenu={(e: MouseEvent) => {
			const row = get_row(e)
			if (row) {
				selection.handle_contextmenu(e, row.index)
			}
		}}
		ondragstart={on_drag_start}
		ondragover={(e: DragEvent) => {
			const row = get_row(e)
			if (row) {
				on_drag_over(e, row.element, row.index)
			}
		}}
		ondrop={drop_handler}
		ondragend={() => (drag_to_index = null)}
		ondragleave={() => (drag_to_index = null)}
	>
		<div class="relative" slot="data-rgCol-rgRow">
			<div class="drag-line" class:hidden={drag_to_index === null} bind:this={drag_line}></div>
		</div>
	</revo-grid>
</div>

<style lang="sass">
	.grid-header
		position: relative
		height: 24px
		line-height: 24px
		font-size: 12px
		flex-shrink: 0
		.rgCell
			height: 24px
			top: 0
			left: 0
			position: absolute
			box-sizing: border-box
			height: 100%
			overflow: visible
			white-space: nowrap
		.rgCell.sort
			font-weight: 500
		.rgCell.sort::after
			content: '▲'
			padding-left: 1px
			transform: scale(0.8, 0.5)
			display: inline-block
		&.desc .rgCell.sort::after
			content: '▼'
	.grid-container :global
		revo-grid
			outline: none
			min-height: 50px
		revogr-header
			display: none
		.rgCell
			padding: 0 5px
			&:first-child
				padding-left: 10px
			&:last-child
				padding-right: 0px
			&.index, &.playCount, &.skipCount, &.duration
				padding-left: 0px
				padding-right: 10px
				text-align: right
		.image
			display: flex
			align-items: center
			img
				display: block
				object-fit: contain
				height: 24px
				width: 18px
				padding: 3px 0
			.error::before
				content: ''
				cursor: pointer
				display: block
				width: 100%
				height: 100%
				background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="%23ef4444"><path d="M9,4c-2.76,0 -5,2.24 -5,5c0,2.76 2.24,5 5,5c2.76,0 5,-2.24 5,-5c0,-2.76 -2.24,-5 -5,-5Zm0.5,7.5l-1,0l0,-1l1,0l0,1Zm0,-2l-1,0l0,-3l1,0l0,3Z"/></svg>')
			.error.missing::before
				cursor: default
				background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><rect x="0" y="0" width="18" height="18" fill="%232b2c31" rx="2" ry="2"/><path fill="%2345464a" d="M12.667,5l-5.332,1.195l-0,4.347c-0.993,-0.197 -2.002,0.557 -2.002,1.384c0,0.713 0.557,1.074 1.162,1.074c0.718,-0 1.504,-0.509 1.505,-1.546l0,-3.633l4,-0.82l0,2.875c-0.992,-0.196 -2,0.554 -2,1.38c0,0.714 0.572,1.077 1.174,1.077c0.713,0 1.492,-0.508 1.493,-1.545l-0,-5.788Z"/></svg>');
		.loading
			visibility: hidden
		.rgRow
			line-height: 24px
			font-size: 12px
			box-shadow: none
		.rgRow.odd
			background-color: hsla(0, 0%, 90%, 0.06)
		.rgRow.selected
			background-color: hsla(var(--hue), 20%, 42%, 0.8)
		.rgRow.playing.selected
			--revo-grid-text: #ffffff
		.rgRow.playing
			--revo-grid-text: #00ffff
		.playing > .index
			background-repeat: no-repeat
			background-size: 16px
			background-position-y: center
			background-position-x: calc(100% - 10px)
			color: transparent
			// We use background-image because setting it with innerHTML breaks row recycling updates
			// #00ffff
			background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2300ffff'%3E%3Cpath d='M0 0h24v24H0z' fill='none'/%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/%3E%3C/svg%3E")
		.playing.selected > .index
			// #ffffff
			background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'%3E%3Cpath d='M0 0h24v24H0z' fill='none'/%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/%3E%3C/svg%3E")
	.grid-container:focus-within :global
		.rgRow.selected
			background-color: hsla(var(--hue), 70%, 46%, 1)

	// .tracklist
	// 	display: flex
	// 	flex-direction: column
	// 	min-width: 0px
	// 	width: 100%
	// 	background-color: rgba(0, 0, 0, 0.01)
	// 	overflow: hidden
	// .row
	// 	display: flex
	// 	max-width: 100%
	// 	$row-height: 24px
	// 	height: $row-height
	// 	font-size: 12px
	// 	line-height: $row-height
	// 	box-sizing: border-box
	// 	position: relative
	// .c
	// 	display: inline-block
	// 	vertical-align: top
	// 	width: 100%
	// 	white-space: nowrap
	// 	overflow: hidden
	// 	text-overflow: ellipsis
	// 	padding-left: 5px
	// 	padding-right: 5px
	// .dateAdded
	// 	font-variant-numeric: tabular-nums
	.drag-line
		position: absolute
		width: 100%
		height: 2px
		background-color: var(--drag-line-color)
		pointer-events: none
		z-index: 5
	.col-drag-line
		position: absolute
		width: 2px
		height: 100vh
		background-color: var(--drag-line-color)
		pointer-events: none
		z-index: 5
</style>
