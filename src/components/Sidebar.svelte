<script lang="ts">
  import SidebarItems from './SidebarItems.svelte'
  import Filter from './Filter.svelte'
  import { trackLists } from '../stores/data'
  import { ipcRenderer } from '../stores/window'
  import { visible as playlistModalVisible } from './PlaylistInfo.svelte'
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
  async function onContextMenu(e: HTMLDivElement) {
    const clickedId = await ipcRenderer.invoke('showPlaylistMenu')
    if (clickedId === null) return
    if (clickedId === 'New Playlist') {
      playlistModalVisible.open('root')
    } else {
      console.error('Unknown contextMenu ID', clickedId)
    }
  }
</script>

<template lang="pug">
  .sidebar(on:mousedown|self|preventDefault)
    .content
      .spacer(on:mousedown|self|preventDefault)
      Filter
      .items(tabindex='0' on:keydown='{handleKeydown}' bind:this='{viewport}')
        .spacer
        SidebarItems(trackList='{special}')
        .spacer(on:contextmenu='{onContextMenu}')
        SidebarItems(trackList='{$trackLists.root}')
        .spacer(on:contextmenu='{onContextMenu}')
        .bottom-space(on:contextmenu='{onContextMenu}')
</template>

<style lang="sass">
  .sidebar
    width: 230px
    min-width: 230px
    display: flex
    flex-direction: column
    padding-top: var(--titlebar-height)
    background-color: var(--sidebar-bg-color)
  .content
    overflow-y: scroll
    display: flex
    flex-direction: column
    flex-grow: 1
    background-color: var(--sidebar-bg-color) // for scrollbar color
  .spacer
    height: 10px
    flex-shrink: 0
  .items
    width: 100%
    flex-grow: 1
    font-size: 13px
    outline: none
    background-color: inherit
    display: flex
    flex-direction: column
  .bottom-space
    flex-grow: 1
</style>
