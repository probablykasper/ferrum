<script lang="ts">
  import SidebarItems from './SidebarItems.svelte'
  import Filter from './Filter.svelte'
  import { trackLists } from '../stores/data'
  const special = {
    children: ['root'],
  }
  let viewport: HTMLDivElement
  function handleKeydown(e: KeyboardEvent) {
    let prevent = true
    if (e.key == 'Home') viewport.scrollTop = 0
    else if (e.key == 'End') viewport.scrollTop = viewport.scrollHeight
    else if (e.key == 'PageUp') viewport.scrollTop -= viewport.clientHeight
    else if (e.key == 'PageDown') viewport.scrollTop += viewport.clientHeight
    else prevent = false
    if (prevent) e.preventDefault()
  }
</script>

<template lang="pug">
  .sidebar(on:mousedown|self|preventDefault)
    .spacer(on:mousedown|self|preventDefault)
    Filter
    .items(tabindex='0' on:keydown='{handleKeydown}' bind:this='{viewport}')
      .spacer
      SidebarItems(trackList='{special}')
      .spacer
      SidebarItems(trackList='{$trackLists.root}')
      .spacer
</template>

<style lang="sass">
  .sidebar
    width: 230px
    min-width: 230px
    display: flex
    flex-direction: column
    padding-top: var(--titlebar-height)
    background-color: var(--sidebar-bg-color)
    // background-color: #151518
    // background: linear-gradient(#23232a, #151519)
  .spacer
    height: 10px
  .items
    width: 100%
    height: 100%
    font-size: 13px
    overflow-y: scroll
    outline: none
    background-color: inherit
</style>
