<script>
  import { trackLists } from '../stores/library.js'
  // import { Router, navigate, Route, link } from 'svelte-routing'
  export let trackList
  let childLists = []
  $: {
    childLists = []
    for (const id of trackList.children) {
      childLists.push($trackLists[id])
    }
  }
</script>

<style lang='sass'>
  .item
    height: 24px
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    position: relative
    display: flex
    align-items: center
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
</style>

<template lang='pug'>
  +each('childLists as childList')
    +if('childList.type === "folder"')
      .item(class:show='{childList.show}' on:click!='{e => childList.show = !childList.show }')
        svg.arrow(xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24")
          path(d='M21 12l-18 12v-24z')
        div {childList.name}
      .sub(class:show='{childList.show}')
        svelte:self(trackList='{childList}')
      +else()
        .item
          .arrow
          div {childList.name}
</template>
