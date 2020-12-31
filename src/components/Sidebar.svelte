<script>
  import SidebarItems from './SidebarItems.svelte'
  import { trackLists } from '../stores/library.js'
</script>

<style lang='sass'>
  .sidebar
    width: 230px
    padding-right: 10px
    padding-top: 10px
    padding-bottom: 10px
    font-size: 14px
    min-width: 230px
    overflow-y: scroll
    background-color: var(--bg-color-2)
</style>

<template lang='pug'>
  .sidebar
    SidebarItems(trackList='{$trackLists.root}')
</template>
