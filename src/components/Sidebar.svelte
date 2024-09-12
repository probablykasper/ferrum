<script lang="ts">
  import SidebarItems, { type SidebarItemHandle } from './SidebarItems.svelte'
  import Filter from './Filter.svelte'
  import { isMac, trackListsDetailsMap, page, movePlaylist } from '../lib/data'
  import { ipcListen, ipcRenderer } from '../lib/window'
  import { writable } from 'svelte/store'
  import { onDestroy, setContext, tick } from 'svelte'
  import { dragged } from '../lib/drag-drop'
  import { tracklist_actions } from '@/lib/page'

  const special = [
    { id: 'root', name: 'Songs', kind: 'special', view_as: 0 },
    { id: 'root', name: 'Artists', kind: 'special', view_as: 1 },
  ]
  let viewport: HTMLElement
  const itemHandle = setContext('itemHandle', writable(null as SidebarItemHandle | null))

  onDestroy(
    ipcListen('Select Previous List', () => {
      $itemHandle?.handleKey(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    }),
  )
  onDestroy(
    ipcListen('Select Next List', () => {
      $itemHandle?.handleKey(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    }),
  )

  async function onContextMenu() {
    await ipcRenderer.invoke('showTracklistMenu', {
      id: 'root',
      isFolder: false,
      isRoot: true,
    })
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
      const root = $trackListsDetailsMap['root']
      if (!root.children) {
        return
      }
      movePlaylist(dragged.playlist.id, dragged.playlist.fromFolder, 'root', root.children.length)
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

<!-- NOTE: aside is used as css selector in SidebarItems -->
<aside on:mousedown|self|preventDefault role="none">
  {#if isMac}
    <div class="titlebar" on:mousedown|self|preventDefault role="none" />
  {/if}
  <div class="content" bind:this={contentElement}>
    <Filter
      on:focus={() => {
        contentElement.scrollTop = 0
      }}
      on:keydown={(e) => {
        if (e.key === 'Escape') {
          tracklist_actions.focus()
        }
      }}
    />
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <nav
      class="items"
      tabindex="-1"
      on:keydown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          tracklist_actions.focus()
        } else if (e.key == 'Home' || e.key == 'End' || e.key == 'PageUp' || e.key == 'PageDown') {
          e.preventDefault()
        } else {
          $itemHandle?.handleKey(e)
        }
      }}
      bind:this={viewport}
      class:droppable={rootDroppable}
      on:contextmenu|self={onContextMenu}
      on:dragover|self={dragover}
      on:dragleave|self={dragleave}
      on:drop|self={drop}
    >
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <div class="focuser" tabindex="0" on:focus={focuser} />
      <div class="spacer" />
      <SidebarItems
        parentId={null}
        children={special}
        on_open={(item) => {
          page.openPlaylist('root', item.view_as ?? 0)
        }}
        on_select_down={() => {
          if ($trackListsDetailsMap.root.children && $trackListsDetailsMap.root.children[0]) {
            page.openPlaylist($trackListsDetailsMap.root.children[0], 0)
          }
        }}
      />
      <div class="spacer" />
      <SidebarItems
        parentId={$trackListsDetailsMap['root'].id}
        children={($trackListsDetailsMap['root'].children || []).map(
          (childId) => $trackListsDetailsMap[childId],
        )}
        on_open={(item) => {
          if ($page.id !== item.id) {
            if (item.id === 'root') {
              page.openPlaylist('root', item.view_as ?? special[special.length - 1].view_as)
            } else {
              page.openPlaylist(item.id, item.view_as ?? 0)
            }
          }
        }}
      />
    </nav>
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
  .titlebar
    -webkit-app-region: drag
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
    pointer-events: none
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
  .droppable
    box-shadow: inset 0px 0px 0px 2px var(--accent-1)
    background-color: hsla(var(--hue), 74%, 53%, 0.1)
</style>
