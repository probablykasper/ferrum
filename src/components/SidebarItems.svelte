<script lang="ts" context="module">
	import {
		track_lists_details_map,
		add_tracks_to_playlist,
		move_playlist,
		shown_playlist_folders,
		view_folder_set_show,
	} from '@/lib/data'
	import Self from './SidebarItems.svelte'

	export type SidebarItemHandle = {
		handleKey(e: KeyboardEvent): void
	}

	let shown_folders = writable(new Set(shown_playlist_folders()))
	function show_folder(id: string) {
		shown_folders.update((folders) => {
			folders.add(id)
			return folders
		})
		view_folder_set_show(id, true)
	}
	function hide_folder(id: string) {
		shown_folders.update((folders) => {
			folders.delete(id)
			return folders
		})
		view_folder_set_show(id, false)
	}
</script>

<script lang="ts">
	import type { TrackListDetails } from '../../ferrum-addon'
	import { type Writable, writable } from 'svelte/store'
	import { getContext } from 'svelte'
	import { dragged } from '../lib/drag-drop'
	import * as dragGhost from './DragGhost.svelte'
	import { ipc_renderer } from '@/lib/window'
	import { check_shortcut } from '@/lib/helpers'
	import { navigate, url } from '@/lib/router'
	import { current_playlist_id } from './TrackList.svelte'

	export let show = true
	export let parent_path: string | null
	export let prevent_drop = false
	type Child = TrackListDetails & { path: string }
	export let children: Child[]

	export let level = 0
	async function tracklist_context_menu(id: string, is_folder: boolean) {
		await ipc_renderer.invoke('showTracklistMenu', { id, isFolder: is_folder, isRoot: false })
	}

	function has_showing_children(id: string) {
		const list = $track_lists_details_map[id]
		return list.children && list.children.length > 0 && $shown_folders.has(id)
	}

	export let on_select_down = () => {}
	function select_first(item: Child) {
		const child_id = item.children?.[0]
		if (child_id) {
			navigate('/playlist/' + $track_lists_details_map[child_id].id)
		}
	}
	function select_last(in_id: string) {
		const children = $track_lists_details_map[in_id].children
		if (children && (has_showing_children(in_id) || in_id === 'root')) {
			select_last(children[children.length - 1])
		} else {
			navigate('/playlist/' + $track_lists_details_map[in_id].id)
		}
	}
	function select_up(i: number) {
		const prev = children[i - 1] || null
		if (i === 0 && parent_path) {
			navigate(parent_path)
		} else if (prev && has_showing_children(prev.id)) {
			select_last(prev.id)
		} else if (prev) {
			navigate(prev.path)
		}
	}
	function select_down(i: number) {
		if (has_showing_children(children[i].id)) {
			select_first(children[i])
		} else if (children[i + 1]) {
			navigate(children[i + 1].path)
		} else {
			on_select_down()
		}
	}

	export function handle_key(e: KeyboardEvent) {
		const index = children.findIndex((child) => {
			return child.path === $url.pathname
		})
		if (index < 0) {
			return
		}

		const selected_list = $track_lists_details_map[$current_playlist_id]
		if (check_shortcut(e, 'ArrowUp')) {
			select_up(index)
		} else if (check_shortcut(e, 'ArrowUp', { alt: true })) {
			navigate('/playlist/root')
		} else if (check_shortcut(e, 'ArrowDown', { alt: true })) {
			select_last('root')
		} else if (check_shortcut(e, 'ArrowDown')) {
			select_down(index)
		} else if (check_shortcut(e, 'ArrowLeft')) {
			if (selected_list.kind === 'folder' && $shown_folders.has(selected_list.id)) {
				hide_folder(selected_list.id)
			} else if (parent_path) {
				navigate(parent_path)
			}
		} else if (check_shortcut(e, 'ArrowRight') && selected_list.kind === 'folder') {
			show_folder(selected_list.id)
		} else {
			return
		}
		e.preventDefault()
	}
	$: if (children.find((child) => child.path === $url.pathname)) {
		const item_handle = getContext<Writable<SidebarItemHandle | null>>('itemHandle')
		item_handle.set({ handleKey: handle_key })
	}

	let drag_track_onto_index = null as number | null
	let drop_above = false
	let drag_playlist_onto_index = null as number | null

	function on_drag_start(e: DragEvent, tracklist: TrackListDetails) {
		if (e.dataTransfer && tracklist.kind !== 'special' && parent_path) {
			e.dataTransfer.effectAllowed = 'move'
			dragGhost.set_inner_text(tracklist.name)
			dragged.playlist = {
				id: tracklist.id,
				from_folder: parent_path,
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
			<a
				href="/playlist/{child_list.id}"
				tabindex="-1"
				class="item rounded-r-[5px]"
				style:padding-left={14 * level + 'px'}
				class:active={child_list.path === $url.pathname}
				draggable="true"
				on:dragstart={(e) => on_drag_start(e, child_list)}
				class:show={$shown_folders.has(child_list.id)}
				class:droppable={drag_playlist_onto_index === i}
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
				on:mousedown={() => navigate(child_list.path)}
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
			</a>
			<Self
				show={$shown_folders.has(child_list.id)}
				parent_path={child_list.path}
				children={child_list.children?.map((child_id) => ({
					path: '/playlist/' + child_id,
					...$track_lists_details_map[child_id],
				})) || []}
				level={level + 1}
				prevent_drop={prevent_drop || dragged.playlist?.id === child_list.id}
				on_select_down={() => {
					if (i < children.length - 1) {
						navigate(children[i + 1].path)
					} else {
						on_select_down()
					}
				}}
			/>
		{:else if child_list.kind === 'playlist'}
			<!-- svelte-ignore a11y-interactive-supports-focus -->
			<a
				href="/playlist/{child_list.id}"
				tabindex="-1"
				class="item rounded-r-[5px]"
				aria-label="playlist"
				style:padding-left={14 * level + 'px'}
				draggable="true"
				on:dragstart={(e) => on_drag_start(e, child_list)}
				class:active={child_list.path === $url.pathname}
				on:mousedown={() => navigate(child_list.path)}
				class:droppable={drag_track_onto_index === i}
				class:droppable-above={drag_playlist_onto_index === i && drop_above}
				class:droppable-below={drag_playlist_onto_index === i && !drop_above}
				on:drop={(e) => {
					if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.tracks' && dragged.tracks) {
						add_tracks_to_playlist(child_list.id, dragged.tracks.ids)
						drag_track_onto_index = null
					} else if (
						e.currentTarget &&
						e.dataTransfer?.types[0] === 'ferrum.playlist' &&
						dragged.playlist &&
						!prevent_drop &&
						parent_path !== null
					) {
						const rect = e.currentTarget.getBoundingClientRect()
						drop_above = e.pageY < rect.bottom - rect.height / 2
						move_playlist(
							dragged.playlist.id,
							dragged.playlist.from_folder,
							parent_path,
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
			</a>
		{:else}
			<a
				href="/playlist/{child_list.id}"
				tabindex="-1"
				class="item rounded-r-[5px]"
				style:padding-left={14 * level + 'px'}
				on:mousedown={() => navigate(child_list.path)}
				class:active={child_list.path === $url.pathname}
			>
				<div class="arrow" />
				<div class="text">
					{child_list.name}
				</div>
			</a>
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
