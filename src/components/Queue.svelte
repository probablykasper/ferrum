<script lang="ts">
  import {
    appendToUserQueue,
    getByQueueIndex,
    getQueueLength,
    insertIds,
    moveIndexes,
    prependToUserQueue,
    queue,
    type Queue,
    type QueueItem,
  } from '../lib/queue'
  import { page, paths } from '../lib/data'
  import { onDestroy } from 'svelte'
  import VirtualListItemed from './VirtualListItemed.svelte'
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
  import VirtualListBlock from './VirtualListBlock.svelte'

  let objectUrls: string[] = []

  onDestroy(() => {
    for (let url of objectUrls) {
      URL.revokeObjectURL(url)
    }
  })

  // let show_history = false
  // $: items = getQueue($queue, show_history)
  // $: up_next_index = $queue.past.length + ($queue.current ? 1 : 0)

  // function getQueue(queue: Queue, show_history: boolean) {
  //   // reset selection/dragging if queue gets updated
  //   selection.clear()
  //   draggedIndexes = []

  //   const newItems: (number | string)[] = []
  //   let i = 0

  //   if (queue.past.length) {
  //     newItems.push('History')
  //     if (show_history) {
  //       for (const _ of queue.past) {
  //         newItems.push(i)
  //         i++
  //       }
  //     } else {
  //       i += queue.past.length
  //     }
  //   }
  //   if (queue.current) {
  //     i += 1
  //   }

  //   if (queue.userQueue.length) {
  //     newItems.push('Up Next')
  //     for (const _ of queue.userQueue) {
  //       newItems.push(i)
  //       i++
  //     }
  //   }

  //   if (queue.autoQueue.length) {
  //     newItems.push('Autoplay')
  //     for (const _ of queue.autoQueue) {
  //       newItems.push(i)
  //       i++
  //     }
  //   }

  //   if (newItems.length === 0) {
  //     newItems.push('Up Next')
  //   }

  //   return newItems
  // }

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
  $: $queue, selection.clear()

  function removeFromQueue() {
    if ($selection.count >= 1) {
      queue.removeIndexes(selection.getSelectedIndexes())
    }
  }
  onDestroy(ipcListen('context.Remove from Queue', removeFromQueue))

  let queue_element: HTMLElement
  export let onTrackInfo: (allIds: TrackID[], index: number) => void

  const trackActionUnlisten = ipcListen('selectedTracksAction', (_, action) => {
    let firstIndex = selection.findFirst()

    if (firstIndex === null || !queue_element.contains(document.activeElement)) {
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
      const allItems = [...$queue.userQueue, ...$queue.autoQueue]
      const allIds = allItems.map((item) => item.id)
      onTrackInfo(allIds, firstIndex)
    } else if (action === 'revealTrackFile') {
      const track = methods.getTrack(queue.getByQueueIndex(firstIndex).id)
      ipcRenderer.invoke('revealTrackFile', paths.tracksDir, track.file)
    } else if (action === 'Remove from Playlist') {
      return
    } else if (action === 'Delete from Library') {
      return
    } else {
      assertUnreachable(action)
    }
  })
  onDestroy(trackActionUnlisten)

  // let dragLine: HTMLElement
  // let draggedIndexes: number[] = []
  // function onDragStart(e: DragEvent) {
  //   if (e.dataTransfer) {
  //     draggedIndexes = []
  //     for (let i = 0; i < $selection.list.length; i++) {
  //       if ($selection.list[i]) {
  //         draggedIndexes.push(i)
  //       }
  //     }
  //     e.dataTransfer.effectAllowed = 'move'
  //     if (draggedIndexes.length === 1) {
  //       const track = methods.getTrack(getByQueueIndex(draggedIndexes[0]).id)
  //       dragGhost.setInnerText(track.artist + ' - ' + track.name)
  //     } else {
  //       dragGhost.setInnerText(draggedIndexes.length + ' items')
  //     }
  //     dragged.tracks = {
  //       ids: draggedIndexes.map((i) => getByQueueIndex(i).id),
  //       queueIndexes: draggedIndexes,
  //     }
  //     e.dataTransfer.setDragImage(dragGhost.dragEl, 0, 0)
  //     e.dataTransfer.setData('ferrum.tracks', '')
  //   }
  // }
  // let dragToIndex: null | number = null
  // let dragTopOfItem = false
  // function onDragOver(e: DragEvent, index: number) {
  //   if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.tracks' && index >= up_next_index) {
  //     e.preventDefault()
  //     const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  //     if (e.pageY < rect.bottom - rect.height / 2) {
  //       dragLine.style.top = rect.top - 1 + 'px'
  //       dragToIndex = index
  //       dragTopOfItem = true
  //     } else {
  //       dragLine.style.top = rect.bottom - 1 + 'px'
  //       dragToIndex = index + 1
  //       dragTopOfItem = false
  //     }
  //   }
  // }
  // function dragEndHandler() {
  //   dragToIndex = null
  // }
  // function dropHandler() {
  //   if (dragToIndex === null) {
  //     return
  //   }
  //   if (dragged.tracks) {
  //     const newSelection = dragged.tracks.queueIndexes
  //       ? moveIndexes(dragged.tracks.queueIndexes, dragToIndex, dragTopOfItem)
  //       : insertIds(dragged.tracks.ids, dragToIndex, dragTopOfItem)
  //     for (let i = newSelection.from; i <= newSelection.to; i++) {
  //       selection.add(i)
  //     }
  //     dragToIndex = null
  //   }
  // }

  let scroll_container: HTMLDivElement
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<aside
  bind:this={queue_element}
  class="outline-none"
  tabindex="-1"
  transition:fly={{ x: '100%', duration: 150, opacity: 1 }}
  on:keydown={(e) => {
    if (checkShortcut(e, 'Backspace') && $selection.count >= 1) {
      e.preventDefault()
      removeFromQueue()
    } else {
      selection.handleKeyDown(e)
    }
  }}
>
  <div class="shadow" />
  <div class="content relative -mt-px border-l" bind:this={scroll_container}>
    {#if $queue.past.length || $queue.current}
      <div class="relative">
        <h4
          class="sticky top-0 z-1 flex h-[40px] items-center border-y bg-[hsl(226,35%,11%)]/50 backdrop-blur-md"
        >
          History
        </h4>
        <VirtualListBlock
          bind:this={history_list}
          items={$queue.past}
          get_key={(i) => i.qId}
          item_height={54}
          {scroll_container}
          let:item
          let:i
        >
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-interactive-supports-focus -->
          <div
            class="row"
            role="row"
            class:selected={$selection.list[i] === true}
            on:mousedown={(e) => selection.handleMouseDown(e, i)}
            on:contextmenu={(e) => selection.handleContextMenu(e, i)}
            on:click={(e) => selection.handleClick(e, i)}
          >
            <QueueItemComponent id={item.id} />
          </div>
        </VirtualListBlock>
        {#if $queue.current}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-interactive-supports-focus -->
          <div
            class="row"
            role="row"
            class:selected={$selection.list[$queue.past.length] === true}
            on:mousedown={(e) => selection.handleMouseDown(e, $queue.past.length)}
            on:contextmenu={(e) => selection.handleContextMenu(e, $queue.past.length)}
            on:click={(e) => selection.handleClick(e, $queue.past.length)}
          >
            <QueueItemComponent id={$queue.current.item.id} />
          </div>
        {/if}
      </div>
    {/if}

    <div class="relative">
      <h4
        class="sticky top-0 z-1 flex h-[40px] items-center border-y bg-[hsl(226,35%,11%)]/50 backdrop-blur-md"
      >
        Up Next
      </h4>
      <VirtualListBlock
        bind:this={up_next_list}
        items={$queue.userQueue}
        get_key={(i) => i.qId}
        item_height={54}
        {scroll_container}
        let:item
        let:i
      >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-interactive-supports-focus -->
        <div
          class="row"
          role="row"
          class:selected={$selection.list[i + $queue.past.length + Number(!!$queue.current)] ===
            true}
          on:mousedown={(e) =>
            selection.handleMouseDown(e, i + $queue.past.length + Number(!!$queue.current))}
          on:contextmenu={(e) =>
            selection.handleContextMenu(e, i + $queue.past.length + Number(!!$queue.current))}
          on:click={(e) =>
            selection.handleClick(e, i + $queue.past.length + Number(!!$queue.current))}
        >
          <QueueItemComponent id={item.id} />
        </div>
      </VirtualListBlock>
    </div>

    <div class="relative">
      <h4
        class="sticky top-0 z-1 flex h-[40px] items-center border-y bg-[hsl(226,35%,11%)]/50 backdrop-blur-md"
      >
        Autoplay
      </h4>
      <VirtualListBlock
        bind:this={autoplay_list}
        items={$queue.autoQueue}
        get_key={(i) => i.qId}
        item_height={54}
        {scroll_container}
        let:item
        let:i
        id="autoplay"
      >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-interactive-supports-focus -->
        <div
          class="row"
          role="row"
          class:selected={$selection.list[
            i + $queue.past.length + Number(!!$queue.current) + $queue.userQueue.length
          ] === true}
          on:mousedown={(e) =>
            selection.handleMouseDown(
              e,
              i + $queue.past.length + Number(!!$queue.current) + $queue.userQueue.length,
            )}
          on:contextmenu={(e) =>
            selection.handleContextMenu(
              e,
              i + $queue.past.length + Number(!!$queue.current) + $queue.userQueue.length,
            )}
          on:click={(e) =>
            selection.handleClick(
              e,
              i + $queue.past.length + Number(!!$queue.current) + $queue.userQueue.length,
            )}
        >
          <QueueItemComponent id={item.id} />
        </div>
      </VirtualListBlock>
    </div>
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
  h4
    padding-left: 18px
  .drag-line
    position: absolute
    width: 100%
    height: 2px
    background-color: var(--drag-line-color)
    pointer-events: none
    display: none
    &.show
      display: block
  .history-button
    width: 100%
    font-size: inherit
    background: none
    border: none
    padding: 0
    cursor: pointer
</style>
