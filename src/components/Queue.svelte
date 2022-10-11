<script lang="ts">
  import { queue, Queue } from '../lib/queue'
  import { onDestroy } from 'svelte'
  import VirtualList from './VirtualListItemed.svelte'
  import QueueItem from './QueueItem.svelte'

  let objectUrls: string[] = []

  onDestroy(() => {
    for (let url of objectUrls) {
      URL.revokeObjectURL(url)
    }
  })

  $: items = getQueue($queue)

  function getQueue(queue: Queue) {
    const nextIndex = queue.currentIndex + 1

    const userQueue = []
    for (let i = nextIndex; i < queue.currentIndex + queue.userQueueLength + 1; i++) {
      userQueue.push(queue.ids[i])
    }

    const autoQueue = []
    for (let i = nextIndex + queue.userQueueLength; i < queue.ids.length; i++) {
      autoQueue.push(queue.ids[i])
      if (autoQueue.length >= 20) {
        break
      }
    }

    const newQueue: (0 | 1 | string)[] = []
    if (userQueue.length) {
      newQueue.push(0, ...userQueue)
    }
    if (autoQueue.length) {
      newQueue.push(1, ...autoQueue)
    }

    return newQueue
  }
</script>

<div class="queue">
  <div class="shadow" />
  <div class="content">
    <VirtualList {items} itemHeight={54} itemCount={items.length} let:item>
      <div class="row">
        {#if item === 0}
          <h4>Up Next</h4>
        {:else if item === 1}
          <h4>Autoplay</h4>
        {:else}
          <QueueItem id={item} />
        {/if}
      </div>
    </VirtualList>
  </div>
</div>

<style lang="sass">
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
  h4
    font-weight: 600
    padding-left: 8px
    margin: 12px 0px
</style>
