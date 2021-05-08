<script lang="ts">
  import { onMount } from 'svelte'

  export let getItem: Function
  export let visibleItems: any[] = []
  export let itemCount: number = 0
  export let itemHeight: number = 0
  export let startIndex: number = 0
  export let endIndex: number = 0
  let height: number = 0
  let scrollTop: number = 0
  let paddingTop: number = 0
  let paddingBottom: number = 0

  let viewport: HTMLDivElement
  function handleScroll(e: Event) {
    const target = e.target as HTMLTextAreaElement
    scrollTop = target.scrollTop
  }

  function keydown(e: KeyboardEvent) {
    if (e.key === ' ') return e.preventDefault()

    let prevent = true
    if (e.key === 'Home') viewport.scrollTop = 0
    else if (e.key === 'End') viewport.scrollTop = viewport.scrollHeight
    else if (e.key === 'PageUp') viewport.scrollTop -= viewport.clientHeight
    else if (e.key === 'PageDown') viewport.scrollTop += viewport.clientHeight
    else prevent = false
    if (prevent) e.preventDefault()
  }

  let mounted: boolean
  onMount(() => {
    scrollTop = viewport.scrollTop
    mounted = true
  })

  $: if (mounted) updateView(height, scrollTop, itemHeight, itemCount)
  let refresher = 1
  export function refresh() {
    if (mounted) updateView(height, scrollTop, itemHeight, itemCount)
    if (refresher < 10000) refresher++
    else refresher = 1
  }
  function updateView(height: number, scrollTop: number, itemHeight: number, itemCount: number) {
    const newHeight = itemCount * itemHeight

    let bottomPixel = scrollTop + height
    if (bottomPixel > newHeight) bottomPixel = newHeight
    let topPixel = bottomPixel - height
    if (topPixel < 0) topPixel = 0

    startIndex = Math.floor(topPixel / itemHeight)
    endIndex = Math.ceil(bottomPixel / itemHeight)

    const lastIndexes = itemCount - endIndex
    paddingTop = startIndex * itemHeight
    paddingBottom = lastIndexes * itemHeight
  }

  $: if (refresher !== 0) getItems(startIndex, endIndex)
  function getItems(startIndex: number, endIndex: number) {
    const newItems = []
    const visibleCount = endIndex - startIndex
    for (let i = 0; i < visibleCount; i++) {
      const item = getItem(startIndex + i)
      newItems.push(item)
    }
    visibleItems = newItems
  }
</script>

<style lang="sass">
  .viewport
    height: 100%
    overflow-y: scroll
    outline: none
    background-color: inherit
</style>

<div
  class="viewport"
  bind:this={viewport}
  bind:clientHeight={height}
  on:scroll={handleScroll}
  on:keydown
  tabindex="0"
  on:keydown={keydown}>
  <div class="content" style="padding-top: {paddingTop}px; padding-bottom: {paddingBottom}px;">
    {#each visibleItems as item, index}
      <slot {item} index={startIndex + index} />
    {/each}
  </div>
</div>
