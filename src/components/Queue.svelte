<script lang="ts">
  import { queue } from '../stores/queue'
  import { methods } from '../stores/data'
  import { fade } from 'svelte/transition'

  async function loadCover(id: string) {
    try {
      let buf = await methods.readCoverAsync(id)
      let url = URL.createObjectURL(new Blob([buf], {}))
      return url
    } catch (e) {
      throw null
    }
  }

  function getItem(index: number) {
    const id = $queue.ids[index]
    return { id, track: methods.getTrack(id) }
  }

  let userQueue: ReturnType<typeof getItem>[] = []
  $: {
    const newUserQueue = []
    for (let i = 0; i < $queue.userQueueLength; i++) {
      newUserQueue.push(getItem($queue.currentIndex + 1 + i))
    }
    userQueue = newUserQueue
  }

  let autoQueue: ReturnType<typeof getItem>[] = []
  $: {
    const newAutoQueue = []
    for (let i = 0; i < 20; i++) {
      const qi = $queue.currentIndex + 1 + $queue.userQueueLength + i
      if (qi < $queue.ids.length) {
        newAutoQueue.push(getItem(qi))
      }
    }
    autoQueue = newAutoQueue
  }
</script>

<style lang="sass">
  .queue
    position: absolute
    right: 0px
    height: 100%
    box-sizing: border-box
    display: flex
    padding-top: var(--titlebar-height)
    pointer-events: none
  .shadow
    height: 100%
    width: 20px
    box-shadow: inset -20px 0 20px -20px #000000
  .content
    height: 100%
    width: 250px
    background-color: var(--sidebar-bg-color)
    pointer-events: all
    overflow-y: scroll
    border-left: 1px solid var(--border-color)
  .row
    height: 54px
    display: flex
    align-items: center
    padding: 0px 10px
    box-sizing: border-box
  h3, h4
    font-weight: 600
    padding-left: 10px
    margin: 12px 0px
  h4
    font-weight: 400
  .text
    overflow: hidden
    white-space: nowrap
  p
    margin: 0px
    font-size: 14px
    overflow: hidden
    text-overflow: ellipsis
  .artist
    opacity: 0.75
    font-size: 12px
  .box
    width: 42px
    min-width: 42px
    height: 42px
    min-height: 42px
    margin-right: 10px
  .cover
    width: 42px
    min-width: 42px
    height: 42px
    min-height: 42px
  img.cover
    object-fit: contain
  svg.cover
    padding: 12px
    box-sizing: border-box
    background: var(--empty-cover-bg-color)
    fill: var(--empty-cover-color)
    border-radius: 2px
</style>

<div class="queue">
  <div class="shadow" />
  <div class="content">
    <h3>Up Next</h3>
    {#each userQueue as item}
      <div class="row">
        <div class="box">
          {#await loadCover(item.id) then blob}
            <img class="cover" src={blob} alt="" in:fade={{ duration: 300 }} />
          {:catch}
            <svg
              class="cover"
              in:fade={{ duration: 300 }}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24">
              <path
                d="M23 0l-15.996 3.585v13.04c-2.979-.589-6.004 1.671-6.004 4.154 0 2.137 1.671 3.221 3.485 3.221 2.155 0 4.512-1.528 4.515-4.638v-10.9l12-2.459v8.624c-2.975-.587-6 1.664-6 4.141 0 2.143 1.715 3.232 3.521 3.232 2.14 0 4.476-1.526 4.479-4.636v-17.364z" />
            </svg>
          {/await}
        </div>
        <div class="text">
          <p>{item.track.name}</p>
          <p class="artist">{item.track.artist}</p>
        </div>
      </div>
    {/each}
    {#if $queue.userQueueLength > 0}
      <h4>Continue</h4>
    {/if}
    {#each autoQueue as item}
      <div class="row">
        <div class="box">
          {#await loadCover(item.id) then blob}
            <img class="cover" src={blob} alt="" in:fade={{ duration: 300 }} />
          {:catch}
            <svg
              class="cover"
              in:fade={{ duration: 300 }}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24">
              <path
                d="M23 0l-15.996 3.585v13.04c-2.979-.589-6.004 1.671-6.004 4.154 0 2.137 1.671 3.221 3.485 3.221 2.155 0 4.512-1.528 4.515-4.638v-10.9l12-2.459v8.624c-2.975-.587-6 1.664-6 4.141 0 2.143 1.715 3.232 3.521 3.232 2.14 0 4.476-1.526 4.479-4.636v-17.364z" />
            </svg>
          {/await}
        </div>
        <div class="text">
          <p>{item.track.name}</p>
          <p class="artist">{item.track.artist}</p>
        </div>
      </div>
    {/each}
  </div>
</div>
