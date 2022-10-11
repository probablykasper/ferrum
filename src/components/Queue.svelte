<script lang="ts">
  import { getByQueueIndex, getQueueLength, queue, Queue } from '../lib/queue'
  import { onDestroy } from 'svelte'
  import VirtualList from './VirtualListItemed.svelte'
  import QueueItem from './QueueItem.svelte'
  import { newSelection } from '@/lib/selection'
  import { showTrackMenu } from '@/lib/menus'

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
        <h4 class="row">{item}</h4>
      {:else}
        <div
          class="row"
          class:selected={$selection.list[item] === true}
          on:mousedown={(e) => selection.handleMouseDown(e, item)}
          on:contextmenu={(e) => selection.handleContextMenu(e, item)}
          on:click={(e) => selection.handleClick(e, item)}
        >
          <QueueItem id={getByQueueIndex(item)} />
        </div>
      {/if}
    </VirtualList>
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
</style>
