<script lang="ts">
  import SidebarItems, { type SidebarItemHandle } from './SidebarItems.svelte'
  import Filter from './Filter.svelte'
  import { isMac, trackListsDetailsMap, page, movePlaylist } from '../lib/data'
  import { ipcRenderer } from '../lib/window'
  import { writable } from 'svelte/store'
  import { setContext, tick } from 'svelte'
  import { dragged } from '../lib/drag-drop'

  const special = {
    children: ['root'],
  }
  let viewport: HTMLDivElement
  const itemHandle = setContext('itemHandle', writable(null as SidebarItemHandle | null))

  async function onContextMenu() {
    await ipcRenderer.invoke('showTracklistMenu', {
      id: 'root',
      isFolder: false,
      isRoot: true,
    })
  }
  function open(id: string) {
    if ($page.id !== id) page.openPlaylist(id)
  }

  let rootDroppable = false
  function dragover(e: DragEvent) {
    if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.playlist') {
      rootDroppable = true
      e.preventDefault()
    }
  }
  function dragleave() {
    rootDroppable = false
  }
  function drop(e: DragEvent) {
    if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.playlist' && dragged.playlist) {
      movePlaylist(dragged.playlist.id, dragged.playlist.fromFolder, 'root')
      rootDroppable = false
    }
  }

  let contentElement: HTMLDivElement

  $: pageId = $page.id
  $: pageId, scrollToActive()
  async function scrollToActive() {
    await tick()
    const active = contentElement?.querySelector('.active')
    if (active instanceof HTMLElement) {
      const top = active.offsetTop
      if (contentElement.scrollTop > top) {
        contentElement.scrollTop = top
      } else if (
        contentElement.scrollTop + contentElement.clientHeight <
        top + active.clientHeight
      ) {
        contentElement.scrollTop = top + active.clientHeight - contentElement.clientHeight
      }
    }
  }

  /** Prevent focus weirdness */
  function focuser() {
    const scrollTop = contentElement.scrollTop
    viewport.focus()
    contentElement.scrollTop = scrollTop
    scrollToActive()
  }
</script>

<!-- NOTE: aside is used as css selector in -->
<aside on:mousedown|self|preventDefault>
  {#if isMac}
    <div class="titlebar-spacer" />
  {/if}
  <div class="content" bind:this={contentElement}>
    <Filter
      on:focus={() => {
        contentElement.scrollTop = 0
      }}
    />
    <div
      class="items"
      tabindex="-1"
      on:keydown={(e) => {
        if (e.key == 'Home' || e.key == 'End' || e.key == 'PageUp' || e.key == 'PageDown') {
          e.preventDefault()
        } else {
          $itemHandle?.handleKey(e)
        }
      }}
      bind:this={viewport}
      class:droppable={rootDroppable}
    >
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <div class="focuser" tabindex="0" on:focus={focuser} />
      <div class="spacer" />
      <SidebarItems
        trackList={special}
        on:selectDown={() => {
          if ($trackListsDetailsMap.root.children && $trackListsDetailsMap.root.children[0]) {
            open($trackListsDetailsMap.root.children[0])
          }
        }}
        parentId={null}
      />
      <div
        class="spacer"
        on:contextmenu={onContextMenu}
        on:dragover={dragover}
        on:dragleave={dragleave}
        on:drop={drop}
      />
      <SidebarItems
        trackList={{ children: $trackListsDetailsMap['root'].children || [] }}
        parentId={$trackListsDetailsMap['root'].id}
      />
      <div
        class="bottom-space spacer"
        on:contextmenu={onContextMenu}
        on:dragover={dragover}
        on:dragleave={dragleave}
        on:drop={drop}
      />
    </div>
  </div>
</aside>

<style lang="sass">
  aside
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
    position: relative // for SidebarItems scrollToIndex
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
    &:focus .focuser
      display: none
  .bottom-space
    flex-grow: 1
  .droppable
    box-shadow: inset 0px 0px 0px 2px var(--accent-1)
    background-color: hsla(var(--hue), 74%, 53%, 0.1)
</style>
