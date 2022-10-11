<script lang="ts">
  import {
    getByQueueIndex,
    getQueueLength,
    insertIds,
    moveIndexes,
    queue,
    Queue,
  } from '../lib/queue'
  import { page } from '../lib/data'
  import { onDestroy } from 'svelte'
  import VirtualList from './VirtualListItemed.svelte'
  import QueueItemComponent from './QueueItem.svelte'
  import { newSelection } from '@/lib/selection'
  import { showTrackMenu } from '@/lib/menus'
  import { dragged } from '@/lib/drag-drop'
  import { methods } from '@/lib/data'
  import * as dragGhost from './DragGhost.svelte'
  import { ipcRenderer } from '@/lib/window'
  import { checkShortcut } from '@/lib/helpers'

  let objectUrls: string[] = []

  onDestroy(() => {
    for (let url of objectUrls) {
      URL.revokeObjectURL(url)
    }
  })

  $: items = getQueue($queue)

  function getQueue(queue: Queue) {
    // reset selection/dragging if queue gets updated
    selection.clear()
    draggedIndexes = []

    const newItems: (number | string)[] = []
    let i = 0

    if (queue.userQueue.length) {
      newItems.push('Up Next')
      queue.userQueue.forEach(() => {
        newItems.push(i)
        i++
      })
    }

    if (queue.autoQueue.length) {
      newItems.push('Autoplay')
      queue.autoQueue.forEach(() => {
        newItems.push(i)
        i++
      })
    }

    if (newItems.length === 0) {
      newItems.push('Up Next')
    }

    return newItems
  }

  let virtualList: VirtualList<typeof items[number]>

  const selection = newSelection({
    getItemCount: () => getQueueLength(),
    scrollToItem: (i) => {
      let itemIndex = 0
      while (itemIndex <= i) {
        if (typeof items[itemIndex] === 'string') i++
        itemIndex++
      }
      virtualList.scrollToItem(i)
    },
    async onContextMenu() {
      const indexes = selection.getSelectedIndexes()
      const allItems = [...$queue.userQueue, ...$queue.autoQueue]
      const allIds = allItems.map((item) => item.id)
      await showTrackMenu(allIds, indexes, undefined, true)
    },
  })

  function removeFromQueue() {
    if ($selection.count >= 1) {
      queue.removeIndexes(selection.getSelectedIndexes())
    }
  }
  ipcRenderer.on('context.Remove from Queue', removeFromQueue)
  onDestroy(() => {
    ipcRenderer.off('context.Remove from Queue', removeFromQueue)
  })

  let dragLine: HTMLElement
  let draggedIndexes: number[] = []
  function onDragStart(e: DragEvent) {
    if (e.dataTransfer) {
      draggedIndexes = []
      for (let i = 0; i < $selection.list.length; i++) {
        if ($selection.list[i]) {
          draggedIndexes.push(i)
        }
      }
      e.dataTransfer.effectAllowed = 'move'
      if (draggedIndexes.length === 1) {
        const track = methods.getTrack(getByQueueIndex(draggedIndexes[0]).id)
        dragGhost.setInnerText(track.artist + ' - ' + track.name)
      } else {
        dragGhost.setInnerText(draggedIndexes.length + ' items')
      }
      dragged.tracks = {
        ids: draggedIndexes.map((i) => getByQueueIndex(i).id),
        queueIndexes: draggedIndexes,
      }
      e.dataTransfer.setDragImage(dragGhost.dragEl, 0, 0)
      e.dataTransfer.setData('ferrum.tracks', '')
    }
  }
  let dragToIndex: null | number = null
  let dragTopOfItem = false
  function onDragOver(e: DragEvent, index: number) {
    if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.tracks') {
      e.preventDefault()
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      if (e.pageY < rect.bottom - rect.height / 2) {
        dragLine.style.top = rect.top - 1 + 'px'
        dragToIndex = index
        dragTopOfItem = true
      } else {
        dragLine.style.top = rect.bottom - 1 + 'px'
        dragToIndex = index + 1
        dragTopOfItem = false
      }
    }
  }
  function dragEndHandler() {
    dragToIndex = null
  }
  function dropHandler() {
    if (dragToIndex === null) {
      return
    }
    if (dragged.tracks) {
      if ($queue.userQueue.length === 0) {
        // if user drags to top of autoqueue, create userqueue
        dragTopOfItem = false
      }
      const newSelection = dragged.tracks.queueIndexes
        ? moveIndexes(dragged.tracks.queueIndexes, dragToIndex, !dragTopOfItem)
        : insertIds(dragged.tracks.ids, dragToIndex, !dragTopOfItem)
      for (let i = newSelection.from; i <= newSelection.to; i++) {
        selection.add(i)
      }
      dragToIndex = null
    }
  }

  function keydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'Backspace') && $selection.count >= 1) {
      e.preventDefault()
      removeFromQueue()
    } else {
      selection.handleKeyDown(e)
    }
  }

  $: if ($page && virtualList) {
    virtualList.refresh()
  }
</script>

<div class="queue">
  <div class="shadow" />
  <div class="content">
    <VirtualList
      bind:this={virtualList}
      {items}
      getKey={(i) => {
        if (typeof i === 'number') {
          return getByQueueIndex(i).qId
        } else {
          return i
        }
      }}
      itemHeight={54}
      let:item
      on:keydown={keydown}
      on:mousedown-self={selection.clear}
    >
      {#if typeof item === 'string'}
        <h4 class="row" on:dragover={() => (dragToIndex = null)}>{item}</h4>
      {:else}
        <div
          class="row"
          class:selected={$selection.list[item] === true}
          on:mousedown={(e) => selection.handleMouseDown(e, item)}
          on:contextmenu={(e) => selection.handleContextMenu(e, item)}
          on:click={(e) => selection.handleClick(e, item)}
          draggable="true"
          on:dragstart={onDragStart}
          on:dragover={(e) => onDragOver(e, item)}
          on:drop={dropHandler}
          on:dragend={dragEndHandler}
        >
          <QueueItemComponent id={getByQueueIndex(item).id} />
        </div>
      {/if}
    </VirtualList>
    <div class="drag-line" class:show={dragToIndex !== null} bind:this={dragLine} />
  </div>
</div>

<style lang="sass">
  .selected
    background-color: hsla(var(--hue), 16%, 42%, 0.5)
  :global(:focus)
    .selected
      background-color: hsla(var(--hue), 70%, 42%, 1)
  .queue
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
    height: 100%
    width: 250px
    background-color: #000000
    pointer-events: all
    overflow-y: scroll
    border-left: 1px solid var(--border-color)
  .row
    height: 54px
    display: flex
    align-items: center
    padding: 0px 10px
    box-sizing: border-box
  h4.row
    font-weight: 600
    padding-left: 18px
    margin: 0px
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
