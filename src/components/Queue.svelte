<script lang="ts">
	import {
		clear_user_queue,
		get_by_queue_index,
		insert_ids,
		move_indexes,
		queue,
		type QueueItem,
	} from '../lib/queue'
	import { onDestroy, tick } from 'svelte'
	import QueueItemComponent from './QueueItem.svelte'
	import { dragged } from '@/lib/drag-drop'
	import { get_track } from '@/lib/data'
	import * as dragGhost from './DragGhost.svelte'
	import { ipc_listen, ipc_renderer } from '@/lib/window'
	import { check_shortcut } from '@/lib/helpers'
	import { fly } from 'svelte/transition'
	import VirtualListBlock, { scroll_container_keydown } from './VirtualListBlock.svelte'
	import type { SelectedTracksAction } from '@/electron/typed_ipc'
	import { get_flattened_tracklists, handle_selected_tracks_action } from '@/lib/menus'
	import { SvelteSelection } from '@/lib/selection'

	let object_urls: string[] = []

	onDestroy(() => {
		for (let url of object_urls) {
			URL.revokeObjectURL(url)
		}
	})

	let show_history = false
	$: current_index = $queue.past.length
	$: up_next_index = current_index + Number(!!$queue.current)
	$: first_visible_index = show_history ? 0 : up_next_index
	$: autoplay_index = up_next_index + $queue.user_queue.length

	let history_list: VirtualListBlock<QueueItem> | null
	let up_next_list: VirtualListBlock<QueueItem> | null
	let autoplay_list: VirtualListBlock<QueueItem>

	let visible_qids = [
		...(show_history ? $queue.past : []),
		...(show_history && $queue.current ? [$queue.current.item] : []),
		...$queue.user_queue,
		...$queue.auto_queue,
	].map((item) => item.qId)
	$: visible_qids = [
		...(show_history ? $queue.past : []),
		...(show_history && $queue.current ? [$queue.current.item] : []),
		...$queue.user_queue,
		...$queue.auto_queue,
	].map((item) => item.qId)
	const selection = new SvelteSelection(visible_qids, {
		scroll_to: ({ index }) => {
			if (show_history) {
				if (index < $queue.past.length) {
					return history_list?.scroll_to_index(index, 40)
				}
				index -= $queue.past.length
				if ($queue.current && index === 0) {
					return history_list?.scroll_to_index(index, 40)
				}
				index -= Number(!!$queue.current)
			}
			if (index < $queue.user_queue.length) {
				return up_next_list?.scroll_to_index(index, 40)
			}
			index -= $queue.user_queue.length
			autoplay_list.scroll_to_index(index, 40)
		},
		async on_contextmenu() {
			const action = await ipc_renderer.invoke('show_tracks_menu', {
				is_editable_playlist: false,
				queue: true,
				lists: get_flattened_tracklists(),
			})
			if (action !== null) {
				handle_action(action)
			}
		},
	})
	$: selection.update_all_items(visible_qids)

	function remove_from_queue() {
		if (selection.items.size >= 1) {
			const indexes = selection.get_selected_indexes().map((i) => i + first_visible_index)
			queue.removeIndexes(indexes)
		}
	}
	onDestroy(ipc_listen('context.Remove from Queue', remove_from_queue))

	let queue_element: HTMLElement

	function handle_action(action: SelectedTracksAction) {
		const first_index = selection.find_first_index()
		const indexes = selection.get_selected_indexes()
		const visible_track_ids = [
			...(show_history ? $queue.past : []),
			...(show_history && $queue.current ? [$queue.current.item] : []),
			...$queue.user_queue,
			...$queue.auto_queue,
		].map((item) => item.id)
		const selected_visible_track_ids = indexes.map((i) => visible_track_ids[i])
		handle_selected_tracks_action({
			action,
			track_ids: selected_visible_track_ids,
			all_ids: visible_track_ids,
			first_index,
		})
	}

	const track_action_unlisten = ipc_listen('selected_tracks_action', (_, action) => {
		if (queue_element.contains(document.activeElement)) {
			handle_action(action)
		}
	})
	onDestroy(track_action_unlisten)

	let drag_line: HTMLElement
	let dragged_indexes: number[] = []
	function on_drag_start(e: DragEvent) {
		if (e.dataTransfer) {
			dragged_indexes = selection.get_selected_indexes().map((i) => i + first_visible_index)
			e.dataTransfer.effectAllowed = 'move'
			if (dragged_indexes.length === 1) {
				const track = get_track(get_by_queue_index(dragged_indexes[0]).id)
				dragGhost.set_inner_text(track.artist + ' - ' + track.name)
			} else {
				dragGhost.set_inner_text(dragged_indexes.length + ' items')
			}
			dragged.tracks = {
				ids: dragged_indexes.map((i) => get_by_queue_index(i).id),
				queue_indexes: dragged_indexes,
			}
			e.dataTransfer.setDragImage(dragGhost.drag_el, 0, 0)
			e.dataTransfer.setData('ferrum.tracks', '')
		}
	}
	let drag_to_index: null | number = null
	let drag_top_of_item = false
	function on_drag_over(e: DragEvent, index: number) {
		if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.tracks' && index >= up_next_index) {
			e.preventDefault()
			const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
			if (e.pageY < rect.bottom - rect.height / 2) {
				drag_line.style.top = rect.top - 1 + queue_element.scrollTop + 'px'
				drag_to_index = index
				drag_top_of_item = true
			} else {
				drag_line.style.top = rect.bottom - 1 + queue_element.scrollTop + 'px'
				drag_to_index = index + 1
				drag_top_of_item = false
			}
		}
	}
	function drag_end_handler() {
		drag_to_index = null
	}
	function drop_handler() {
		if (drag_to_index === null) {
			return
		}
		if (dragged.tracks) {
			const to_boundary = drag_to_index === autoplay_index
			const to_user_queue_bottom = to_boundary && !drag_top_of_item
			const to_auto_queue_top = to_boundary && drag_top_of_item
			const create_user_queue = to_auto_queue_top && $queue.user_queue.length === 0

			const to_user_queue =
				drag_to_index < autoplay_index || to_user_queue_bottom || create_user_queue

			if (dragged.tracks.queue_indexes) {
				move_indexes(dragged.tracks.queue_indexes, drag_to_index, to_user_queue)
			} else {
				insert_ids(dragged.tracks.ids, drag_to_index, to_user_queue)
			}
			selection.clear()
			drag_to_index = null
		}
	}
</script>

<aside transition:fly={{ x: '100%', duration: 150, opacity: 1 }}>
	<div class="shadow"></div>
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		bind:this={queue_element}
		class="content relative -mt-px border-l outline-none"
		tabindex="-1"
		on:mousedown|self={() => selection.clear()}
		on:keydown={scroll_container_keydown}
		on:keydown={(e) => {
			if (check_shortcut(e, 'Backspace') && selection.items.size >= 1) {
				e.preventDefault()
				remove_from_queue()
			} else {
				selection.handle_keydown(e)
			}
		}}
	>
		{#if $queue.past.length || $queue.current}
			<div class="relative">
				<div class="sticky top-0 z-1 flex h-[40px] items-center bg-black/50 backdrop-blur-md">
					<button
						type="button"
						on:click={() => {
							show_history = !show_history
							tick().then(() => {
								up_next_list?.refresh()
								autoplay_list.refresh()
							})
						}}
						class="group ml-1.5 flex h-full items-center pl-1 font-semibold"
						tabindex="-1"
						on:mousedown|preventDefault
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="mr-0.5 flex opacity-60 transition duration-100 group-hover:opacity-100"
							class:rotate-90={show_history}
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M9 6l6 6l-6 6" /></svg
						>
						History
					</button>
					<div class="h-full w-0 grow" style:-webkit-app-region="drag"></div>
				</div>
				{#if show_history}
					<VirtualListBlock
						bind:this={history_list}
						items={$queue.past}
						get_key={(item) => item.qId}
						item_height={54}
						scroll_container={queue_element}
						let:item
						let:i={qi}
					>
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-interactive-supports-focus -->
						<div
							class="row"
							role="row"
							class:selected={$selection.has(item.qId)}
							on:mousedown={(e) => selection.handle_mousedown(e, qi)}
							on:contextmenu={(e) => selection.handle_contextmenu(e, qi)}
							on:click={(e) => selection.handle_click(e, qi)}
							draggable="true"
							on:dragstart={on_drag_start}
							on:dragover={(e) => on_drag_over(e, qi)}
							on:drop={drop_handler}
							on:dragleave={drag_end_handler}
							on:dragend={drag_end_handler}
						>
							<QueueItemComponent id={item.id} />
						</div>
					</VirtualListBlock>
					{#if $queue.current}
						{@const qi = current_index}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-interactive-supports-focus -->
						<div
							class="row"
							role="row"
							class:selected={$selection.has($queue.current.item.qId)}
							on:mousedown={(e) => selection.handle_mousedown(e, qi)}
							on:contextmenu={(e) => selection.handle_contextmenu(e, qi)}
							on:click={(e) => selection.handle_click(e, qi)}
							draggable="true"
							on:dragstart={on_drag_start}
							on:dragover={(e) => on_drag_over(e, qi)}
							on:drop={drop_handler}
							on:dragleave={drag_end_handler}
							on:dragend={drag_end_handler}
						>
							<QueueItemComponent id={$queue.current.item.id} />
						</div>
					{/if}
				{/if}
			</div>
		{/if}

		{#if $queue.user_queue.length || queue.getQueueLength() === 0}
			<div class="relative">
				<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
				<h4
					class="sticky top-0 z-1 flex h-[40px] items-center justify-between bg-black/50 px-7 font-semibold backdrop-blur-md"
					on:mousedown|self={() => selection.clear()}
				>
					Up Next
					{#if $queue.user_queue.length > 0}
						<button
							type="button"
							aria-label="Clear 'Up Next'"
							tabindex="-1"
							on:mousedown|preventDefault
							on:click={clear_user_queue}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="parent-active-zoom"
								height="24px"
								viewBox="0 0 24 24"
								width="24px"
								fill="#e8eaed"
								><path d="M0 0h24v24H0z" fill="none" /><path
									d="M5 13h14v-2H5v2zm-2 4h14v-2H3v2zM7 7v2h14V7H7z"
								/></svg
							>
						</button>
					{/if}
				</h4>
				<VirtualListBlock
					bind:this={up_next_list}
					items={$queue.user_queue}
					get_key={(item) => item.qId}
					item_height={54}
					scroll_container={queue_element}
					let:item
					let:i
				>
					{@const qi = i + up_next_index}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-interactive-supports-focus -->
					<div
						class="row"
						role="row"
						class:selected={$selection.has(item.qId)}
						on:mousedown={(e) => selection.handle_mousedown(e, qi - first_visible_index)}
						on:contextmenu={(e) => selection.handle_contextmenu(e, qi - first_visible_index)}
						on:click={(e) => selection.handle_click(e, qi - first_visible_index)}
						draggable="true"
						on:dragstart={on_drag_start}
						on:dragover={(e) => on_drag_over(e, qi)}
						on:drop={drop_handler}
						on:dragleave={drag_end_handler}
						on:dragend={drag_end_handler}
					>
						<QueueItemComponent id={item.id} />
					</div>
				</VirtualListBlock>
			</div>
		{/if}

		{#if $queue.auto_queue.length}
			<div class="relative">
				<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
				<h4
					class="sticky top-0 z-1 flex h-[40px] items-center bg-black/50 px-7 font-semibold backdrop-blur-md"
					on:mousedown={() => selection.clear()}
				>
					Autoplay
				</h4>
				<VirtualListBlock
					bind:this={autoplay_list}
					items={$queue.auto_queue}
					get_key={(item) => item.qId}
					item_height={54}
					scroll_container={queue_element}
					let:item
					let:i
				>
					{@const qi = i + autoplay_index}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-interactive-supports-focus -->
					<div
						class="row"
						role="row"
						class:selected={$selection.has(item.qId)}
						on:mousedown={(e) => selection.handle_mousedown(e, qi - first_visible_index)}
						on:contextmenu={(e) => selection.handle_contextmenu(e, qi - first_visible_index)}
						on:click={(e) => selection.handle_click(e, qi - first_visible_index)}
						draggable="true"
						on:dragstart={on_drag_start}
						on:dragover={(e) => on_drag_over(e, qi)}
						on:drop={drop_handler}
						on:dragleave={drag_end_handler}
						on:dragend={drag_end_handler}
					>
						<QueueItemComponent id={item.id} />
					</div>
				</VirtualListBlock>
			</div>
		{/if}
		<div
			bind:this={drag_line}
			class="drag-line pointer-events-none absolute z-10 h-[2px] w-full bg-[var(--drag-line-color)]"
			class:hidden={drag_to_index === null}
		></div>
	</div>
</aside>

<style lang="sass">
	.selected
		background-color: hsla(var(--hue), 16%, 42%, 0.5)
	:global(:focus)
		.selected
			background-color: hsla(var(--hue), 70%, 42%, 1)
	aside
		position: absolute
		right: 0px
		height: 100%
		box-sizing: border-box
		display: flex
		pointer-events: none
		overflow: hidden
	.shadow
		height: 100%
		width: 20px
		box-shadow: inset -20px 0 20px -20px #000000
	.content
		width: var(--right-sidebar-width)
		background-color: #000000
		pointer-events: all
		overflow-y: scroll
	.row
		height: 54px
		display: flex
		align-items: center
		padding: 0px 10px
		box-sizing: border-box
</style>
