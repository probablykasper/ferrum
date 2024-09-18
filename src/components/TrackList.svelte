<script lang="ts">
	import {
		page,
		remove_from_open_playlist,
		filter,
		delete_tracks_in_open,
		paths,
		view_as_songs,
	} from '../lib/data'
	import { new_playback_instance, playing_id } from '../lib/player'
	import {
		get_duration,
		format_date,
		check_mouse_shortcut,
		check_shortcut,
		assert_unreachable,
	} from '../lib/helpers'
	import { append_to_user_queue, prepend_to_user_queue } from '../lib/queue'
	import { selection, tracklist_actions } from '../lib/page'
	import { ipc_listen, ipc_renderer } from '../lib/window'
	import { onDestroy, onMount } from 'svelte'
	import { dragged } from '../lib/drag-drop'
	import * as dragGhost from './DragGhost.svelte'
	import VirtualListBlock, { scroll_container_keydown } from './VirtualListBlock.svelte'
	import { open_track_info } from './TrackInfo.svelte'
	import type { Track } from 'ferrum-addon/addon'

	let tracklist_element: HTMLDivElement
	export let params: { playlist_id: string }

	$: page.open_playlist(params.playlist_id, view_as_songs)

	const track_action_unlisten = ipc_listen('selectedTracksAction', (_, action) => {
		let first_index = selection.findFirst()
		if (first_index === null || !tracklist_element.contains(document.activeElement)) {
			return
		}
		if (action === 'Play Next') {
			const ids = selection.getSelectedIndexes().map((i) => page.get_track_id(i))
			prepend_to_user_queue(ids)
		} else if (action === 'Add to Queue') {
			const ids = selection.getSelectedIndexes().map((i) => page.get_track_id(i))
			append_to_user_queue(ids)
		} else if (action === 'Get Info') {
			open_track_info(page.get_track_ids(), first_index)
		} else if (action === 'revealTrackFile') {
			const track = page.get_track(first_index)
			ipc_renderer.invoke('revealTrackFile', paths.tracksDir, track.file)
		} else if (action === 'Remove from Playlist') {
			remove_from_open_playlist(selection.getSelectedIndexes())
		} else if (action === 'Delete from Library') {
			delete_indexes(selection.getSelectedIndexes())
		} else {
			assert_unreachable(action)
		}
	})
	onDestroy(track_action_unlisten)

	const sort_by = page.sort_by
	$: sort_key = $page.sortKey

	ipc_renderer.on('Group Album Tracks', (_, checked) => {
		page.set_group_album_tracks(checked)
	})

	function double_click(e: MouseEvent, index: number) {
		if (e.button === 0 && check_mouse_shortcut(e)) {
			play_row(index)
		}
	}
	async function delete_indexes(indexes: number[]) {
		const s = $selection.count > 1 ? 's' : ''
		const result = await ipc_renderer.invoke('showMessageBox', false, {
			type: 'info',
			message: `Delete ${$selection.count} song${s} from library?`,
			buttons: [`Delete Song${s}`, 'Cancel'],
			defaultId: 0,
		})
		if (result.response === 0) {
			delete_tracks_in_open(indexes)
		}
	}
	async function keydown(e: KeyboardEvent) {
		if (check_shortcut(e, 'Enter')) {
			let first_index = selection.findFirst()
			if (first_index !== null) {
				play_row(first_index)
			} else if (!$playing_id) {
				play_row(0)
			}
		} else if (
			check_shortcut(e, 'Backspace') &&
			$selection.count > 0 &&
			!$filter &&
			$page.tracklist.type === 'playlist'
		) {
			e.preventDefault()
			const s = $selection.count > 1 ? 's' : ''
			const result = ipc_renderer.invoke('showMessageBox', false, {
				type: 'info',
				message: `Remove ${$selection.count} song${s} from the list?`,
				buttons: ['Remove Song' + s, 'Cancel'],
				defaultId: 0,
			})
			const indexes = selection.getSelectedIndexes()
			if ((await result).response === 0) {
				remove_from_open_playlist(indexes)
			}
		} else if (check_shortcut(e, 'Backspace', { cmd_or_ctrl: true }) && $selection.count > 0) {
			e.preventDefault()
			delete_indexes(selection.getSelectedIndexes())
		} else {
			selection.handleKeyDown(e)
			return
		}
		e.preventDefault()
	}

	function play_row(index: number) {
		new_playback_instance(page.get_track_ids(), index)
	}

	let drag_line: HTMLElement
	let drag_indexes: number[] = []
	function on_drag_start(e: DragEvent) {
		if (e.dataTransfer) {
			drag_indexes = []
			for (let i = 0; i < $selection.list.length; i++) {
				if ($selection.list[i]) {
					drag_indexes.push(i)
				}
			}
			e.dataTransfer.effectAllowed = 'move'
			if (drag_indexes.length === 1) {
				const track = page.get_track(drag_indexes[0])
				dragGhost.set_inner_text(track.artist + ' - ' + track.name)
			} else {
				dragGhost.set_inner_text(drag_indexes.length + ' items')
			}
			dragged.tracks = {
				ids: drag_indexes.map((i) => page.get_track_id(i)),
				playlist_indexes: drag_indexes,
			}
			e.dataTransfer.setDragImage(dragGhost.drag_el, 0, 0)
			e.dataTransfer.setData('ferrum.tracks', '')
		}
	}
	let drag_to_index: null | number = null
	function on_drag_over(e: DragEvent, index: number) {
		if (
			!$page.sortDesc ||
			$page.sortKey !== 'index' ||
			$filter ||
			$page.tracklist.type !== 'playlist'
		) {
			drag_to_index = null
			return
		}
		if (
			dragged.tracks?.playlist_indexes &&
			e.currentTarget &&
			e.dataTransfer?.types[0] === 'ferrum.tracks'
		) {
			e.preventDefault()
			const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
			if (e.pageY < rect.bottom - rect.height / 2) {
				drag_line.style.top = rect.top - 1 + 'px'
				drag_to_index = index
			} else {
				drag_line.style.top = rect.bottom - 1 + 'px'
				drag_to_index = index + 1
			}
		}
	}
	async function drop_handler() {
		if (drag_to_index !== null) {
			page.move_tracks(drag_indexes, drag_to_index)
			drag_to_index = null
		}
	}
	function drag_end_handler() {
		drag_to_index = null
	}

	function get_item(index: number) {
		try {
			const track = page.get_track(index)
			return { ...track, id: page.get_track_id(index) }
		} catch (_) {
			return null
		}
	}

	let virtual_list: VirtualListBlock<number>

	$: if ($page && virtual_list) {
		virtual_list.refresh()
	}

	let scroll_container: HTMLElement
	onMount(() => {
		tracklist_actions.scroll_to_index = virtual_list.scroll_to_index
	})

	type Column = {
		name: string
		key: 'index' | keyof Track
		width?: string
	}
	const all_columns: Column[] = [
		// sorted alphabetically
		{ name: '#', key: 'index' },
		// { name: 'Size', key: 'size' },
		{ name: 'Album', key: 'albumName', width: '90%' },
		// { name: 'Album Artist', key: 'albumArtist', width: '90%' },
		{ name: 'Artist', key: 'artist', width: '120%' },
		// { name: 'Bitrate', key: 'bitrate' },
		// { name: 'Bpm', key: 'bpm' },
		{ name: 'Comments', key: 'comments', width: '65%' },
		// { name: 'Compilation', key: 'compilation' },
		// { name: 'Composer', key: 'composer' },
		{ name: 'Date Added', key: 'dateAdded' },
		// { name: 'DateImported', key: 'dateImported' },
		// { name: 'DateModified', key: 'dateModified' },
		// { name: 'Disabled', key: 'disabled' },
		// { name: 'DiscCount', key: 'discCount' },
		// { name: 'DiscNum', key: 'discNum' },
		// { name: 'Disliked', key: 'disliked' },
		{ name: 'Time', key: 'duration' },
		{ name: 'Genre', key: 'genre', width: '65%' },
		// { name: 'Grouping', key: 'grouping', width: '65%' },
		// { name: 'ImportedFrom', key: 'importedFrom' },
		// { name: 'Liked', key: 'liked' },
		{ name: 'Name', key: 'name', width: '170%' },
		{ name: 'Plays', key: 'playCount' },
		// { name: 'Rating', key: 'rating' },
		// { name: 'SampleRate', key: 'sampleRate' },
		// { name: 'Skips', key: 'skipCount' },
		// { name: 'SortAlbumArtist', key: 'sortAlbumArtist' },
		// { name: 'SortAlbumName', key: 'sortAlbumName' },
		// { name: 'SortArtist', key: 'sortArtist' },
		// { name: 'SortComposer', key: 'sortComposer' },
		// { name: 'SortName', key: 'sortName' },
		// { name: 'TrackCount', key: 'trackCount' },
		// { name: 'TrackNum', key: 'trackNum' },
		// { name: 'Volume', key: 'volume' },
		{ name: 'Year', key: 'year' },
	]
	let columns: Column[] = [
		{ name: '#', key: 'index' },
		{ name: 'Name', key: 'name', width: '170%' },
		{ name: 'Plays', key: 'playCount' },
		{ name: 'Time', key: 'duration' },
		{ name: 'Artist', key: 'artist', width: '120%' },
		{ name: 'Album', key: 'albumName', width: '90%' },
		{ name: 'Comments', key: 'comments', width: '65%' },
		{ name: 'Genre', key: 'genre', width: '65%' },
		{ name: 'Date Added', key: 'dateAdded' },
		{ name: 'Year', key: 'year' },
	]
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
				}
			} else {
				columns = columns.filter((column) => column.key !== item.id)
			}
		}),
	)
</script>

<div
	bind:this={tracklist_element}
	class="tracklist h-full"
	role="table"
	on:dragleave={() => (drag_to_index = null)}
	class:no-selection={$selection.count === 0}
>
	<!-- svelte-ignore a11y-interactive-supports-focus -->
	<div
		class="row table-header border-b border-b-slate-500/30"
		class:desc={$page.sortDesc}
		role="row"
		on:contextmenu={on_column_context_menu}
	>
		{#each columns as column}
			<!-- svelte-ignore a11y-interactive-supports-focus -->
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div
				class="c {column.key}"
				class:sort={sort_key === column.key}
				style:width={column.width}
				on:click={() => sort_by(column.key)}
				role="button"
			>
				<span>{column.name}</span>
			</div>
		{/each}
	</div>
	<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		bind:this={scroll_container}
		class="main-focus-element relative h-full overflow-y-auto outline-none"
		on:keydown={keydown}
		on:mousedown|self={selection.clear}
		tabindex="0"
		on:keydown={scroll_container_keydown}
	>
		<!-- Using `let:item={i}` instead of `let:i` fixes drag-and-drop -->
		<VirtualListBlock
			bind:this={virtual_list}
			items={Array.from({ length: $page.length }).map((_, i) => i)}
			item_height={24}
			{scroll_container}
			let:item={i}
		>
			{@const track = get_item(i)}
			{#if track !== null}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-interactive-supports-focus -->
				<div
					class="row"
					role="row"
					on:dblclick={(e) => double_click(e, i)}
					on:mousedown={(e) => selection.handleMouseDown(e, i)}
					on:contextmenu={(e) => selection.handleContextMenu(e, i)}
					on:click={(e) => selection.handleClick(e, i)}
					draggable="true"
					on:dragstart={on_drag_start}
					on:dragover={(e) => on_drag_over(e, i)}
					on:drop={drop_handler}
					on:dragend={drag_end_handler}
					class:odd={i % 2 === 0}
					class:selected={$selection.list[i] === true}
					class:playing={track.id === $playing_id}
				>
					{#each columns as column}
						<div class="c {column.key}" style:width={column.width}>
							{#if column.key === 'index'}
								{#if track.id === $playing_id}
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
							{:else}
								{track[column.key] || ''}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</VirtualListBlock>
	</div>
	<div class="drag-line" class:show={drag_to_index !== null} bind:this={drag_line} />
</div>

<style lang="sass">
	.odd
		background-color: hsla(0, 0%, 90%, 0.06)
	.selected
		background-color: hsla(var(--hue), 20%, 42%, 0.8)
	:global(:focus)
		.selected
			background-color: hsla(var(--hue), 70%, 46%, 1)
	.tracklist
		display: flex
		flex-direction: column
		min-width: 0px
		width: 100%
		background-color: rgba(0, 0, 0, 0.01)
		overflow: hidden
		.table-header
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
		display: flex
		max-width: 100%
		$row-height: 24px
		height: $row-height
		font-size: 12px
		line-height: $row-height
		box-sizing: border-box
		position: relative
		&.playing.selected
			color: #ffffff
		&.playing
			color: #00ffff
	.c
		display: inline-block
		vertical-align: top
		width: 100%
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis
		padding-right: 10px
		&:first-child
			padding-left: 10px
			box-sizing: content-box
		&.index, &.playCount, &.skipCount, &.duration
			padding-left: 0px
			text-align: right
			box-sizing: border-box
	.selected .index svg.playing-icon
		fill: var(--icon-color)
	.index
		width: 46px
		flex-shrink: 0
		svg.playing-icon
			fill: #00ffff
			width: 16px
			height: 100%
	.playCount, .skipCount
		width: 52px
		flex-shrink: 0
	.duration
		width: 50px
		flex-shrink: 0
	.dateAdded
		flex-shrink: 0
		width: 140px
		font-variant-numeric: tabular-nums
	.year
		width: 0px
		min-width: 47px
	.drag-line
		position: absolute
		width: 100%
		height: 2px
		background-color: var(--drag-line-color)
		pointer-events: none
		display: none
		&.show
			display: block
</style>
