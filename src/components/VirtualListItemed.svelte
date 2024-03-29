<script lang="ts" generics="T">
  import { createEventDispatcher, onMount, tick } from 'svelte'

  const dispatch = createEventDispatcher<{ 'mousedown-self': null }>()

  // eslint-disable-next-line no-undef
  type X = T

  export let itemHeight: number
  export let items: X[]
  export let getKey: (item: X, i: number) => number | string
  export let buffer = 5
  let startIndex = 0
  let visibleCount = 0
  let height = 0
  let scrollTop = 0

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

  $: if (mounted) updateView(scrollTop, height, itemHeight, items.length)
  function updateView(scrollTop: number, height: number, itemHeight: number, itemCount: number) {
    const newStartIndex = getStartIndex(scrollTop, itemHeight)
    const newEndIndex = getEndIndex(scrollTop, height, itemHeight, itemCount)
    visibleCount = newEndIndex - newStartIndex + 1
    startIndex = newStartIndex
  }

  export async function refresh() {
    if (mounted) {
      startIndex = 0
      await tick()
      // we need to wait a tick so properties can finish updating
      updateView(scrollTop, height, itemHeight, items.length)
    }
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
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
  role="none"
>
  <div
    class="content"
    style:height={items.length * itemHeight + 'px'}
    style:padding-top={startIndex * itemHeight + 'px'}
  >
    <!-- disable no-unused-vars for '_' -->
    <!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
    {#each { length: visibleCount } as _, i (getKey(items[i + startIndex], i + startIndex))}
      <slot item={items[i + startIndex]} index={i + startIndex} />
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
