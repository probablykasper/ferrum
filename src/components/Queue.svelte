<script lang="ts">
	import {
		appendToUserQueue,
		getByQueueIndex,
		getQueueLength,
		insertIds,
		moveIndexes,
		prependToUserQueue,
		queue,
		type QueueItem,
	} from '../lib/queue'
	import { paths } from '../lib/data'
	import { onDestroy } from 'svelte'
	import QueueItemComponent from './QueueItem.svelte'
	import { newSelection } from '@/lib/selection'
	import { showTrackMenu } from '@/lib/menus'
	import { dragged } from '@/lib/drag-drop'
	import { methods } from '@/lib/data'
	import * as dragGhost from './DragGhost.svelte'
	import { ipcListen, ipcRenderer } from '@/lib/window'
	import { assertUnreachable, checkShortcut } from '@/lib/helpers'
	import type { TrackID } from 'ferrum-addon/addon'
	import { fly } from 'svelte/transition'
	import VirtualListBlock, { scroll_container_keydown } from './VirtualListBlock.svelte'

	let objectUrls: string[] = []

	onDestroy(() => {
		for (let url of objectUrls) {
			URL.revokeObjectURL(url)
		}
	})

	let show_history = false
	$: current_index = $queue.past.length
	$: up_next_index = current_index + Number(!!$queue.current)
	$: autoplay_index = up_next_index + $queue.userQueue.length

	let history_list: VirtualListBlock<QueueItem>
	let up_next_list: VirtualListBlock<QueueItem>
	let autoplay_list: VirtualListBlock<QueueItem>

	const selection = newSelection({
		getItemCount: () => getQueueLength(),
		scrollToItem: (i) => {
			if (i < $queue.past.length) {
				return history_list.scroll_to_index(i, 40)
			}
			i -= $queue.past.length
			if ($queue.current && i === 0) {
				return history_list.scroll_to_index(i, 40)
			}
			i -= Number(!!$queue.current)
			if (i < $queue.userQueue.length) {
				return up_next_list.scroll_to_index(i, 40)
			}
			i -= $queue.userQueue.length
			autoplay_list.scroll_to_index(i, 40)
		},
		async onContextMenu() {
			const indexes = selection.getSelectedIndexes()
			const current_array = $queue.current ? [$queue.current.item] : []
			const allItems = [...$queue.past, ...current_array, ...$queue.userQueue, ...$queue.autoQueue]
			const allIds = allItems.map((item) => item.id)
			await showTrackMenu(allIds, indexes, undefined, true)
		},
	})
	$: selection.setMinimumIndex(show_history ? 0 : up_next_index)

	$: $queue, selection.clear()

	function remove_from_queue() {
		if ($selection.count >= 1) {
			queue.removeIndexes(selection.getSelectedIndexes())
		}
	}
	onDestroy(ipcListen('context.Remove from Queue', remove_from_queue))

	let queue_element: HTMLElement
	export let onTrackInfo: (allIds: TrackID[], index: number) => void

	const track_action_unlisten = ipcListen('selectedTracksAction', (_, action) => {
		let first_index = selection.findFirst()

		if (first_index === null || !queue_element.contains(document.activeElement)) {
			return
		}
		if (action === 'Play Next') {
			const indexes = selection.getSelectedIndexes()
			const ids = indexes.map((i) => queue.getByQueueIndex(i).id)
			prependToUserQueue(ids)
		} else if (action === 'Add to Queue') {
			const indexes = selection.getSelectedIndexes()
			const ids = indexes.map((i) => queue.getByQueueIndex(i).id)
			appendToUserQueue(ids)
		} else if (action === 'Get Info') {
			const all_items = [...$queue.userQueue, ...$queue.autoQueue]
			const all_ids = all_items.map((item) => item.id)
			onTrackInfo(all_ids, first_index)
		} else if (action === 'revealTrackFile') {
			const track = methods.getTrack(queue.getByQueueIndex(first_index).id)
			ipcRenderer.invoke('revealTrackFile', paths.tracksDir, track.file)
		} else if (action === 'Remove from Playlist') {
			return
		} else if (action === 'Delete from Library') {
			return
		} else {
			assertUnreachable(action)
		}
	})
	onDestroy(track_action_unlisten)

	let drag_line: HTMLElement
	let dagged_indexes: number[] = []
	function onDragStart(e: DragEvent) {
		if (e.dataTransfer) {
			dagged_indexes = []
			for (let i = 0; i < $selection.list.length; i++) {
				if ($selection.list[i]) {
					dagged_indexes.push(i)
				}
			}
			e.dataTransfer.effectAllowed = 'move'
			if (dagged_indexes.length === 1) {
				const track = methods.getTrack(getByQueueIndex(dagged_indexes[0]).id)
				dragGhost.setInnerText(track.artist + ' - ' + track.name)
			} else {
				dragGhost.setInnerText(dagged_indexes.length + ' items')
			}
			dragged.tracks = {
				ids: dagged_indexes.map((i) => getByQueueIndex(i).id),
				queueIndexes: dagged_indexes,
			}
			e.dataTransfer.setDragImage(dragGhost.dragEl, 0, 0)
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
			const create_user_queue = to_auto_queue_top && $queue.userQueue.length === 0

			const to_user_queue =
				drag_to_index < autoplay_index || to_user_queue_bottom || create_user_queue

			const new_selection = dragged.tracks.queueIndexes
				? moveIndexes(dragged.tracks.queueIndexes, drag_to_index, to_user_queue)
				: insertIds(dragged.tracks.ids, drag_to_index, to_user_queue)
			for (let i = new_selection.from; i <= new_selection.to; i++) {
				selection.add(i)
			}
			drag_to_index = null
		}
	}
</script>

<aside transition:fly={{ x: '100%', duration: 150, opacity: 1 }}>
	<div class="shadow" />
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		bind:this={queue_element}
		class="content relative -mt-px border-l outline-none"
		tabindex="-1"
		on:keydown={scroll_container_keydown}
		on:keydown={(e) => {
			if (checkShortcut(e, 'Backspace') && $selection.count >= 1) {
				e.preventDefault()
				remove_from_queue()
			} else {
				selection.handleKeyDown(e)
			}
		}}
		on:mousedown|self={selection.clear}
	>
		{#if $queue.past.length || $queue.current}
			<div class="relative">
				<div class="sticky top-0 z-1 flex flex h-[40px] items-center bg-black/50 backdrop-blur-md">
					<button
						on:click={() => (show_history = !show_history)}
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
					<div class="h-full w-0 grow" style:-webkit-app-region="drag" />
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
							class:selected={$selection.list[qi] === true}
							on:mousedown={(e) => selection.handleMouseDown(e, qi)}
							on:contextmenu={(e) => selection.handleContextMenu(e, qi)}
							on:click={(e) => selection.handleClick(e, qi)}
							draggable="true"
							on:dragstart={onDragStart}
							on:dragover={(e) => on_drag_over(e, qi)}
							on:drop={drop_handler}
							on:dragleave={drag_end_handler}
							on:dragend={drag_end_handler}
						>
							<QueueItemComponent id={item.id} />
						</div>
					</VirtualListBlock>
					{#if $queue.current}
						{@const qi = $queue.past.length}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-interactive-supports-focus -->
						<div
							class="row"
							role="row"
							class:selected={$selection.list[qi] === true}
							on:mousedown={(e) => selection.handleMouseDown(e, qi)}
							on:contextmenu={(e) => selection.handleContextMenu(e, qi)}
							on:click={(e) => selection.handleClick(e, qi)}
							draggable="true"
							on:dragstart={onDragStart}
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

		{#if $queue.userQueue.length || queue.getQueueLength() === 0}
			<div class="relative">
				<h4
					class="sticky top-0 z-1 flex h-[40px] items-center bg-black/50 pl-7 font-semibold backdrop-blur-md"
				>
					Up Next
				</h4>
				<VirtualListBlock
					bind:this={up_next_list}
					items={$queue.userQueue}
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
						class:selected={$selection.list[qi] === true}
						on:mousedown={(e) => selection.handleMouseDown(e, qi)}
						on:contextmenu={(e) => selection.handleContextMenu(e, qi)}
						on:click={(e) => selection.handleClick(e, qi)}
						draggable="true"
						on:dragstart={onDragStart}
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

		{#if $queue.autoQueue.length}
			<div class="relative">
				<h4
					class="sticky top-0 z-1 flex h-[40px] items-center bg-black/50 pl-7 font-semibold backdrop-blur-md"
				>
					Autoplay
				</h4>
				<VirtualListBlock
					bind:this={autoplay_list}
					items={$queue.autoQueue}
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
						class:selected={$selection.list[qi] === true}
						on:mousedown={(e) => selection.handleMouseDown(e, qi)}
						on:contextmenu={(e) => selection.handleContextMenu(e, qi)}
						on:click={(e) => selection.handleClick(e, qi)}
						draggable="true"
						on:dragstart={onDragStart}
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
			class="pointer-events-none absolute z-10 h-[2px] w-full bg-[var(--drag-line-color)]"
			class:hidden={drag_to_index === null}
		/>
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
