<script lang="ts">
  import {
    getByQueueIndex,
    getQueueLength,
    insertIds,
    moveIndexes,
    queue,
    Queue,
  } from '../lib/queue'
  import { onDestroy } from 'svelte'
  import VirtualList from './VirtualListItemed.svelte'
  import QueueItem from './QueueItem.svelte'
  import { newSelection } from '@/lib/selection'
  import { showTrackMenu } from '@/lib/menus'
  import { dragged } from '@/lib/drag-drop'
  import { methods } from '@/lib/data'
  import * as dragGhost from './DragGhost.svelte'

  let objectUrls: string[] = []

  onDestroy(() => {
    for (let url of objectUrls) {
      URL.revokeObjectURL(url)
    }
  })

  $: items = getQueue($queue)

  function getQueue(queue: Queue) {
    selection.clear()
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
      const indexes = selection.getSelectedIndexes($selection)
      const ids = indexes.map((i) => getByQueueIndex(i))
      await showTrackMenu(ids)
    },
  })

  let dragLine: HTMLElement
  let indexes: number[] = []
  function onDragStart(e: DragEvent) {
    if (e.dataTransfer) {
      indexes = []
      for (let i = 0; i < $selection.list.length; i++) {
        if ($selection.list[i]) {
          indexes.push(i)
        }
      }
      e.dataTransfer.effectAllowed = 'move'
      if (indexes.length === 1) {
        const id = getByQueueIndex(indexes[0])
        const track = methods.getTrack(id)
        dragGhost.setInnerText(track.artist + ' - ' + track.name)
      } else {
        dragGhost.setInnerText(indexes.length + ' items')
      }
      dragged.tracks = {
        ids: indexes.map((i) => getByQueueIndex(i)),
        queueIndexes: indexes,
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
      const newSelection = dragged.tracks.queueIndexes
        ? moveIndexes(indexes, dragToIndex, !dragTopOfItem)
        : insertIds(dragged.tracks.ids, dragToIndex, !dragTopOfItem)
      for (let i = newSelection.from; i <= newSelection.to; i++) {
        selection.add(i)
      }
      dragToIndex = null
    }
  }
</script>

<div class="queue">
  <div class="shadow" />
  <div class="content">
    <VirtualList
      bind:this={virtualList}
      {items}
      itemHeight={54}
      let:item
      on:keydown={selection.handleKeyDown}
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
          <QueueItem id={getByQueueIndex(item)} />
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
