<script>
  import { trackLists, page } from '../stores/data'
  // import { Router, navigate, Route, link } from 'svelte-routing'
  export let trackList
  let childLists = []
  $: {
    childLists = []
    for (const id of trackList.children) {
      const tl = $trackLists[id]
      tl.id = id
      childLists.push(tl)
    }
  }
  function open(id) {
    if ($page.id !== id) page.openPlaylist(id)
  }
</script>

<style lang="sass">
  :global(.active)
    // --sidebar-gradient: linear-gradient(90deg, #3f4c6b, #606c88)
    --sidebar-gradient: linear-gradient(90deg, #1599a8b3, #00c295b3)
  :global(:focus .active)
    --sidebar-gradient: linear-gradient(90deg, #1599a8, #00c295)
    // --gradient: linear-gradient(-90deg, #606c88, #3f4c6b)
    // --gradient: linear-gradient(-90deg, #ea7bb8, #BB377D)
    // --gradient: linear-gradient(90deg, #2847e2, #872edc)
    // --gradient: linear-gradient(90deg, #4C48F6, #4F7CF7)
    // --gradient: linear-gradient(90deg, #2d44b9, #2847e2, #2d44b9)
    // --gradient: linear-gradient(90deg, #EE6957, #F2C251)
    // --gradient: linear-gradient(90deg, #1599a8, #00c295)
  .item
    height: 24px
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    position: relative
    display: flex
    align-items: center
    border-top-right-radius: 3px
    border-bottom-right-radius: 3px
    margin-right: 10px
    &.active
      background: var(--sidebar-gradient)
  .sub
    margin-left: calc(2px + 6px*2)
    display: none
    &.show
      display: block
  .show > svg.arrow
    transform: rotate(90deg)
  .arrow
    margin-left: 2px
    padding: 6px
    width: 6px
    height: 6px
    flex-shrink: 0
    fill: white
  .text
    overflow: hidden
    text-overflow: ellipsis
    padding-right: 10px
</style>

<template lang="pug">
  +each('childLists as childList')
    +if('childList.type === "folder"')
      .item(class:show='{childList.show}' on:click!='{() => childList.show = !childList.show }')
        svg.arrow(xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24")
          path(d='M21 12l-18 12v-24z')
        .text {childList.name}
      .sub(class:show='{childList.show}')
        svelte:self(trackList='{childList}')
      +else()
        .item(on:click='{open(childList.id)}' class:active='{$page.id === childList.id}')
          .arrow
          .text {childList.name}
</template>
