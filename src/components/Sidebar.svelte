<script lang="ts">
  import SidebarItems, { hideFolder, showFolder, SidebarItemHandle } from './SidebarItems.svelte'
  import Filter from './Filter.svelte'
  import { isMac, trackLists, page, movePlaylist } from '../lib/data'
  import { ipcRenderer } from '../lib/window'
  import { open as openNewPlaylistModal } from './PlaylistInfo.svelte'
  import { writable } from 'svelte/store'
  import { setContext } from 'svelte'
  import { dragged } from '../lib/drag-drop'

  const special = {
    children: ['root'],
  }
  let viewport: HTMLDivElement
  const itemHandle = setContext('itemHandle', writable(null as SidebarItemHandle | null))

  function handleKeydown(e: KeyboardEvent) {
    const selectedList = $trackLists[$page.tracklist.id]
    let prevent = true
    if (e.key == 'Home') {
      viewport.scrollTop = 0
    } else if (e.key == 'End') {
      viewport.scrollTop = viewport.scrollHeight
    } else if (e.key == 'PageUp') {
      viewport.scrollTop -= viewport.clientHeight
    } else if (e.key == 'PageDown') {
      viewport.scrollTop += viewport.clientHeight
    } else if (e.key == 'ArrowLeft' && selectedList.type === 'folder') {
      hideFolder(selectedList.id)
    } else if (e.key == 'ArrowRight' && selectedList.type === 'folder') {
      showFolder(selectedList.id)
    } else if (e.key == 'ArrowUp') {
      $itemHandle?.arrowUpDown('ArrowUp')
    } else if (e.key == 'ArrowDown') {
      $itemHandle?.arrowUpDown('ArrowDown')
    } else {
      prevent = false
    }
    if (prevent) {
      e.preventDefault()
    }
  }
  async function onContextMenu() {
    const clickedId = await ipcRenderer.invoke('showPlaylistMenu')
    if (clickedId === null) {
      return
    } else if (clickedId === 'New Playlist') {
      openNewPlaylistModal('root', false)
    } else if (clickedId === 'New Playlist Folder') {
      openNewPlaylistModal('root', true)
    } else {
      console.error('Unknown contextMenu ID', clickedId)
    }
  }
  function open(id: string) {
    if ($page.id !== id) page.openPlaylist(id)
  }

  let rootDroppable = false
</script>

<div class="sidebar" on:mousedown|self|preventDefault>
  {#if isMac}
    <div class="titlebar-spacer" />
  {/if}
  <div class="content">
    <Filter />
    <div
      class="items"
      tabindex="0"
      on:keydown={handleKeydown}
      bind:this={viewport}
      class:droppable={rootDroppable}
      on:dragover|self={(e) => {
        if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.playlist') {
          rootDroppable = true
          e.preventDefault()
        }
      }}
      on:dragleave|self={() => {
        rootDroppable = false
      }}
      on:drop|self={(e) => {
        if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.playlist' && dragged.playlist) {
          movePlaylist(dragged.playlist.id, dragged.playlist.fromFolder, 'root')
          rootDroppable = false
        }
      }}
    >
      <div class="spacer" />
      <SidebarItems
        trackList={special}
        on:selectDown={() => {
          if ($trackLists.root.children[0]) {
            open($trackLists.root.children[0])
          }
        }}
        parentId={null}
      />
      <div class="spacer pointer-events-none" on:contextmenu={onContextMenu} />
      <SidebarItems
        trackList={$trackLists.root}
        on:selectUp={() => {
          open(special.children[special.children.length - 1])
        }}
        parentId={$trackLists.root.id}
      />
      <div class="spacer pointer-events-none" on:contextmenu={onContextMenu} />
      <div class="bottom-space pointer-events-none" on:contextmenu={onContextMenu} />
    </div>
  </div>
</div>

<style lang="sass">
  .pointer-events-none
    pointer-events: none
  .sidebar
    width: 230px
    min-width: 230px
    display: flex
    flex-direction: column
    background-color: hsla(0, 0%, 0%, 0.7)
    box-shadow: inset -6px 0px 6px -6px #000000
  .titlebar-spacer
    height: var(--titlebar-height)
    flex-shrink: 0
  .content
    padding-top: 5px
    overflow-y: auto
    display: flex
    flex-direction: column
    flex-grow: 1
    background-color: rgba(0, 0, 0, 0.01) // for scrollbar color
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
  .droppable
    box-shadow: inset 0px 0px 0px 2px var(--accent-1)
    background-color: hsla(var(--hue), 74%, 53%, 0.1)
</style>
