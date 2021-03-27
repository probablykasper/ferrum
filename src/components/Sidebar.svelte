<script lang="ts">
  import SidebarItems from './SidebarItems.svelte'
  import Filter from './Filter.svelte'
  import { trackLists } from '../stores/data'
  const special = {
    children: ['root'],
  }
  let viewport: HTMLDivElement
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === ' ') {
      let el = e.target as HTMLDivElement
      if (el && el.tagName !== 'INPUT') e.preventDefault()
      return
    }

    let prevent = true
    if (e.key == 'Home') viewport.scrollTop = 0
    else if (e.key == 'End') viewport.scrollTop = viewport.scrollHeight
    else if (e.key == 'PageUp') viewport.scrollTop -= viewport.clientHeight
    else if (e.key == 'PageDown') viewport.scrollTop += viewport.clientHeight
    else prevent = false
    if (prevent) e.preventDefault()
  }
</script>

<style lang="sass">
  .spacer
    height: 10px
  .sidebar
    width: 230px
    padding-top: var(--titlebar-height)
    font-size: 14px
    min-width: 230px
    overflow-y: scroll
    background-color: var(--bg-color-2)
    outline: none
</style>

<template lang="pug">
  .sidebar(tabindex='0' on:keydown='{handleKeydown}' bind:this='{viewport}')
    .spacer
    Filter
    .spacer
    SidebarItems(trackList='{special}')
    .spacer
    SidebarItems(trackList='{$trackLists.root}')
    .spacer
</template>
