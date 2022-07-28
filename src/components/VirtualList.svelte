<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte'

  const dispatch = createEventDispatcher()

  type T = $$Generic
  export let getItem: (index: number) => T
  export let itemCount: number
  export let itemHeight: number
  let startIndex = -1
  let endIndex = -1
  let height = 0
  let scrollTop = 0
  let visibleItems: T[] = []

  export function scrollToItem(index: number) {
    const top = index * itemHeight
    if (viewport.scrollTop > top) {
      viewport.scrollTop = top
    } else if (viewport.scrollTop + viewport.clientHeight < top + itemHeight) {
      viewport.scrollTop = top + itemHeight - viewport.clientHeight
    }
  }

  let viewport: HTMLDivElement
  function handleScroll(e: Event) {
    const target = e.target as HTMLTextAreaElement
    scrollTop = target.scrollTop
  }

  let mounted = false
  onMount(() => {
    scrollTop = viewport.scrollTop
    mounted = true
  })

  function keydown(e: KeyboardEvent) {
    let prevent = true
    if (e.key === 'Home') viewport.scrollTop = 0
    else if (e.key === 'End') viewport.scrollTop = viewport.scrollHeight
    else if (e.key === 'PageUp') viewport.scrollTop -= viewport.clientHeight
    else if (e.key === 'PageDown') viewport.scrollTop += viewport.clientHeight
    else prevent = false
    if (prevent) e.preventDefault()
  }

  const buffer = 5
  function getStartIndex(scrollTop: number, itemHeight: number) {
    let topPixel = scrollTop
    let index = Math.floor(topPixel / itemHeight) - buffer
    return Math.max(0, index)
  }
  function getEndIndex(scrollTop: number, height: number, itemHeight: number, itemCount: number) {
    let bottomPixel = scrollTop + height
    let index = Math.ceil(bottomPixel / itemHeight) + buffer
    return Math.min(itemCount - 1, index)
  }

  $: if (mounted) updateView(scrollTop, height, itemHeight, itemCount)
  function updateView(scrollTop: number, height: number, itemHeight: number, itemCount: number) {
    const newStartIndex = getStartIndex(scrollTop, itemHeight)
    const newEndIndex = getEndIndex(scrollTop, height, itemHeight, itemCount)

    let newVisibleItems = []
    for (let i = newStartIndex; i <= newEndIndex; i++) {
      if (i >= startIndex && i <= endIndex) {
        newVisibleItems.push(visibleItems[i - startIndex])
      } else {
        newVisibleItems.push(getItem(i))
      }
    }
    visibleItems = newVisibleItems
    startIndex = newStartIndex
    endIndex = newEndIndex
  }

  export async function refresh() {
    if (mounted) {
      startIndex = -1
      endIndex = -1
      visibleItems = []
      await tick()
      // we need to wait a tick so properties can finish updating
      updateView(scrollTop, height, itemHeight, itemCount)
    }
  }
</script>

<div
  class="viewport"
  bind:this={viewport}
  bind:clientHeight={height}
  on:scroll={handleScroll}
  on:dragleave
  on:keydown
  on:mousedown|self={() => dispatch('mousedown-self')}
  tabindex="0"
  on:keydown={keydown}
>
  <div
    class="content"
    style="height: {itemCount * itemHeight}px; padding-top: {startIndex * itemHeight}px;"
  >
    {#each visibleItems as item, i}
      <slot {item} index={startIndex + i} />
    {/each}
  </div>
</div>

<style lang="sass">
  .viewport
    height: 100%
    overflow-y: auto
    outline: none
    background-color: inherit
  .content
    box-sizing: border-box
</style>
