<script>
  import { onMount } from 'svelte'
  import SidebarItems from './SidebarItems.svelte'
  import { trackLists } from '../stores/data'
  const special = {
    children: ['root'],
  }
  let viewport
  function handleKeydown(e) {
    if (e.key === ' ') return e.preventDefault()

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
  .sidebar
    width: 230px
    padding-top: 10px
    padding-bottom: 10px
    font-size: 14px
    min-width: 230px
    overflow-y: scroll
    background-color: var(--bg-color-2)
    outline: none
</style>

<template lang="pug">
  .sidebar(tabindex='0' on:keydown='{handleKeydown}' bind:this='{viewport}')
    SidebarItems(trackList='{special}')
    br
    SidebarItems(trackList='{$trackLists.root}')
</template>
