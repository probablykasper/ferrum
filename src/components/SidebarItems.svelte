<script lang="ts" context="module">
	import {
		track_lists_details_map,
		page,
		methods,
		add_track_to_playlist,
		move_playlist,
	} from '../lib/data'

	export type SidebarItemHandle = {
		handleKey(e: KeyboardEvent): void
	}

	let shown_folders = writable(new Set(methods.shownPlaylistFolders()))
	function show_folder(id: string) {
		shown_folders.update((folders) => {
			folders.add(id)
			return folders
		})
		methods.viewFolderSetShow(id, true)
	}
	function hide_folder(id: string) {
		shown_folders.update((folders) => {
			folders.delete(id)
			return folders
		})
		methods.viewFolderSetShow(id, false)
	}
</script>

<script lang="ts">
	import type { TrackListDetails, ViewAs } from '../../ferrum-addon'
	import { type Writable, writable } from 'svelte/store'
	import { getContext } from 'svelte'
	import { dragged } from '../lib/drag-drop'
	import * as dragGhost from './DragGhost.svelte'
	import { ipc_renderer } from '@/lib/window'
	import { check_shortcut } from '@/lib/helpers'

	export let show = true
	export let parent_id: string | null
	export let prevent_drop = false
	export let children: (TrackListDetails & { view_as?: ViewAs })[]

	export let level = 0
	export let on_open: (item: { id: string; view_as?: ViewAs }) => void
	async function tracklist_context_menu(id: string, is_folder: boolean) {
		await ipc_renderer.invoke('showTracklistMenu', { id, isFolder: is_folder, isRoot: false })
	}

	function has_showing_children(id: string) {
		const list = $track_lists_details_map[id]
		return list.children && list.children.length > 0 && $shown_folders.has(id)
	}

	export let on_select_down = () => {}
	function select_first(item: TrackListDetails) {
		const child_id = item.children?.[0]
		if (child_id) {
			on_open($track_lists_details_map[child_id])
		}
	}
	function select_last(in_id: string) {
		const children = $track_lists_details_map[in_id].children
		if (children && (has_showing_children(in_id) || in_id === 'root')) {
			select_last(children[children.length - 1])
		} else {
			on_open($track_lists_details_map[in_id])
		}
	}
	function select_up(i: number) {
		const prev_id = children[i - 1]?.id || null
		if (i === 0 && parent_id) {
			on_open({ id: parent_id })
		} else if (prev_id && has_showing_children(prev_id)) {
			select_last(prev_id)
		} else if (prev_id) {
			on_open({ id: prev_id })
		}
	}
	function select_down(i: number) {
		if (has_showing_children(children[i].id)) {
			select_first(children[i])
		} else if (children[i + 1]) {
			on_open(children[i + 1])
		} else {
			on_select_down()
		}
	}

	export function handle_key(e: KeyboardEvent) {
		const index = children.findIndex((child) => {
			if (child.id === 'root') {
				return child.id === $page.tracklist.id && child.view_as === $page.viewAs
			} else {
				return child.id === $page.tracklist.id
			}
		})
		if (index < 0) {
			return
		}
		const selected_list = $track_lists_details_map[$page.tracklist.id]
		if (check_shortcut(e, 'ArrowUp')) {
			select_up(index)
		} else if (check_shortcut(e, 'ArrowUp', { alt: true })) {
			on_open({ id: 'root' })
		} else if (check_shortcut(e, 'ArrowDown', { alt: true })) {
			select_last('root')
		} else if (check_shortcut(e, 'ArrowDown')) {
			select_down(index)
		} else if (check_shortcut(e, 'ArrowLeft')) {
			if (selected_list.kind === 'folder' && $shown_folders.has(selected_list.id)) {
				hide_folder(selected_list.id)
			} else if (parent_id) {
				on_open({ id: parent_id })
			}
		} else if (check_shortcut(e, 'ArrowRight') && selected_list.kind === 'folder') {
			show_folder(selected_list.id)
		} else {
			return
		}
		e.preventDefault()
	}
	$: if (children.find((child) => child.id === $page.id)) {
		const item_handle = getContext<Writable<SidebarItemHandle | null>>('itemHandle')
		item_handle.set({ handleKey: handle_key })
	}

	let drag_track_onto_index = null as number | null
	let drop_above = false
	let drag_playlist_onto_index = null as number | null

	function on_drag_start(e: DragEvent, tracklist: TrackListDetails) {
		if (e.dataTransfer && tracklist.kind !== 'special' && parent_id) {
			e.dataTransfer.effectAllowed = 'move'
			dragGhost.set_inner_text(tracklist.name)
			dragged.playlist = {
				id: tracklist.id,
				from_folder: parent_id,
				level,
			}
			e.dataTransfer.setDragImage(dragGhost.drag_el, 0, 0)
			e.dataTransfer.setData('ferrum.playlist', '')
		}
	}
</script>

<div class="sub" class:show>
	{#each children as child_list, i}
		{#if child_list.kind === 'folder'}
			<div
				class="item rounded-r-[5px]"
				style:padding-left={14 * level + 'px'}
				class:active={$page.id === child_list.id}
				draggable="true"
				on:dragstart={(e) => on_drag_start(e, child_list)}
				class:show={$shown_folders.has(child_list.id)}
				class:droppable={drag_playlist_onto_index === i}
				role="none"
				on:drop={(e) => {
					if (
						e.currentTarget &&
						e.dataTransfer?.types[0] === 'ferrum.playlist' &&
						dragged.playlist &&
						!prevent_drop &&
						dragged.playlist.id !== child_list.id &&
						child_list.children !== undefined
					) {
						move_playlist(
							dragged.playlist.id,
							dragged.playlist.from_folder,
							child_list.id,
							Math.max(0, child_list.children.length - 1),
						)
						drag_playlist_onto_index = null
					}
				}}
				on:mousedown={() => on_open(child_list)}
				on:contextmenu={() => tracklist_context_menu(child_list.id, true)}
			>
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-interactive-supports-focus -->
				<svg
					class="arrow"
					role="button"
					aria-label="Arrow button"
					on:mousedown|stopPropagation
					on:click={() => {
						if ($shown_folders.has(child_list.id)) {
							hide_folder(child_list.id)
						} else {
							show_folder(child_list.id)
						}
					}}
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
				>
					<path d="M21 12l-18 12v-24z" />
				</svg>
				<!-- svelte-ignore a11y-interactive-supports-focus -->
				<div
					class="text"
					role="link"
					on:dragover={(e) => {
						if (
							e.currentTarget &&
							e.dataTransfer?.types[0] === 'ferrum.playlist' &&
							dragged.playlist &&
							!prevent_drop &&
							dragged.playlist.id !== child_list.id
						) {
							drag_playlist_onto_index = i
							e.preventDefault()
						}
					}}
					on:dragleave|self={() => {
						drag_playlist_onto_index = null
					}}
				>
					{child_list.name}
				</div>
			</div>
			<svelte:self
				show={$shown_folders.has(child_list.id)}
				parentId={child_list.id}
				children={child_list.children?.map((child_id) => $track_lists_details_map[child_id]) || []}
				level={level + 1}
				preventDrop={prevent_drop || dragged.playlist?.id === child_list.id}
				{on_open}
				on_select_down={() => {
					if (i < children.length - 1) {
						on_open(children[i + 1])
					} else {
						on_select_down()
					}
				}}
			/>
		{:else if child_list.kind === 'playlist'}
			<!-- svelte-ignore a11y-interactive-supports-focus -->
			<div
				class="item rounded-r-[5px]"
				role="button"
				aria-label="playlist"
				style:padding-left={14 * level + 'px'}
				draggable="true"
				on:dragstart={(e) => on_drag_start(e, child_list)}
				class:active={$page.id === child_list.id}
				on:mousedown={() => on_open(child_list)}
				class:droppable={drag_track_onto_index === i}
				class:droppable-above={drag_playlist_onto_index === i && drop_above}
				class:droppable-below={drag_playlist_onto_index === i && !drop_above}
				on:drop={(e) => {
					if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.tracks' && dragged.tracks) {
						add_track_to_playlist(child_list.id, dragged.tracks.ids)
						drag_track_onto_index = null
					} else if (
						e.currentTarget &&
						e.dataTransfer?.types[0] === 'ferrum.playlist' &&
						dragged.playlist &&
						!prevent_drop &&
						parent_id !== null
					) {
						const rect = e.currentTarget.getBoundingClientRect()
						drop_above = e.pageY < rect.bottom - rect.height / 2
						move_playlist(
							dragged.playlist.id,
							dragged.playlist.from_folder,
							parent_id,
							drop_above ? i : i + 1,
						)
						drag_playlist_onto_index = null
					}
				}}
				on:contextmenu={() => tracklist_context_menu(child_list.id, false)}
			>
				<div class="arrow" />
				<div
					class="text"
					role="link"
					on:dragover={(e) => {
						if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.tracks' && dragged.tracks) {
							drag_track_onto_index = i
							e.preventDefault()
						} else if (
							e.currentTarget &&
							e.dataTransfer?.types[0] === 'ferrum.playlist' &&
							dragged.playlist &&
							!prevent_drop
						) {
							drag_playlist_onto_index = i
							e.preventDefault()
							const rect = e.currentTarget.getBoundingClientRect()
							drop_above = e.pageY < rect.bottom - rect.height / 2
						}
					}}
					on:dragleave|self={() => {
						drag_track_onto_index = null
						drag_playlist_onto_index = null
					}}
				>
					{child_list.name}
				</div>
			</div>
		{:else}
			<!-- svelte-ignore a11y-interactive-supports-focus -->
			<div
				class="item rounded-r-[5px]"
				role="link"
				style:padding-left={14 * level + 'px'}
				on:mousedown={() => on_open(child_list)}
				class:active={$page.id === child_list.id &&
					child_list.name === ['Songs', 'Artists'][$page.viewAs]}
			>
				<div class="arrow" />
				<div class="text">
					{child_list.name}
				</div>
			</div>
		{/if}
	{/each}
</div>

<style lang="sass">
	.item.active
		box-shadow: inset 2px 0px 0px 0px hsl(var(--hue), 70%, 60%)
		background-image: linear-gradient(90deg, hsl(var(--hue), 45%, 30%) 30%, transparent 66.6666%)
		background-position: 0% 0%
	:global(aside :focus)
		.active
			box-shadow: inset 2px 0px 0px 0px hsl(var(--hue), 70%, 60%)
			background-image: linear-gradient(90deg, hsl(var(--hue), 70%, 46%) 30%, transparent 66.6666%)
	.item
		display: flex
		align-items: center
		margin-right: 10px
		box-sizing: border-box
		z-index: 1
		background-position: 100% 0%
		background-size: 150% 150%
		transition: 260ms background-position cubic-bezier(0, 0.02, 0.2, 1)
	.item.droppable .text
		border-radius: 6px
		box-shadow: inset 0px 0px 0px 2px var(--accent-1)
		background-color: hsla(var(--hue), 74%, 53%, 0.25)
	.item.droppable-above .text
		box-shadow: 0px -1px 0px 0px var(--accent-1), inset 0px 1px 0px 0px var(--accent-1)
	.item.droppable-below .text
		box-shadow: 0px 1px 0px 0px var(--accent-1), inset 0px -1px 0px 0px var(--accent-1)
	.sub
		display: none
		&.show
			display: block
	.arrow
		margin-left: 2px
		margin-right: -8px
		padding: 6px
		width: 19px
		height: 19px
		z-index: 1
		flex-shrink: 0
		fill: white
		transition: 140ms transform var(--cubic-out)
	.show > svg.arrow
		transform: rotate(90deg)
	.text
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis
		padding-right: 10px
		padding-left: 8px
		height: 24px
		line-height: 24px
		flex-grow: 1
		position: relative
</style>
