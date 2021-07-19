<script context="module">
  const hue = Math.round(Math.random() * 360)
  function getStyle(isActive) {
    if (!isActive) return ''
    return (
      `--box-shadow: inset 2px 0px 0px 0px hsl(${hue}, 70%, 60%);` +
      `--background-active: linear-gradient(90deg, hsl(${hue}, 35%, 30%) 30%, #ffffff00);` +
      `--background-normal: linear-gradient(90deg, hsl(${hue}, 35%, 25%) 30%, #ffffff00);`
    )
  }
</script>

<script>
  import { trackLists, page } from '../stores/data'
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
        .item(
          on:mousedown='{open(childList.id)}'
          class:active='{$page.id === childList.id}'
          style='{getStyle($page.id === childList.id)}'
        )
          .arrow
          .text {childList.name}
</template>

<style lang="sass">
  :global(:focus)
    .item.active
      background: var(--background-active)
  .item
    height: 24px
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    position: relative
    display: flex
    align-items: center
    margin-right: 10px
    box-sizing: border-box
    &.active
      box-shadow: var(--box-shadow)
      background: var(--background-normal)
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
