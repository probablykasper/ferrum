<script lang="ts" context="module">
  import { trackLists, page, methods } from '../lib/data'

  export type SidebarItemHandle = {
    arrowUpDown(key: 'ArrowUp' | 'ArrowDown'): void
  }

  let shownFolders = writable(new Set(methods.shownPlaylistFolders()))
  export function showFolder(id: string) {
    shownFolders.update((folders) => {
      folders.add(id)
      return folders
    })
    methods.viewFolderSetShow(id, true)
  }
  export function hideFolder(id: string) {
    shownFolders.update((folders) => {
      folders.delete(id)
      return folders
    })
    methods.viewFolderSetShow(id, false)
  }
</script>

<script lang="ts">
  import type { TrackList } from '../lib/libraryTypes'
  import { ipcRenderer } from '../lib/window'
  import { open as openNewPlaylistModal } from './PlaylistInfo.svelte'
  import { Writable, writable } from 'svelte/store'
  import { createEventDispatcher, SvelteComponent } from 'svelte'
  import { getContext } from 'svelte'

  export let trackList: { children: string[] }
  export let level = 0
  let childLists: TrackList[] = []
  $: {
    childLists = []
    for (const id of trackList.children) {
      const tl = $trackLists[id]
      tl.id = id
      childLists.push(tl)
    }
  }
  function open(id: string) {
    if ($page.id !== id) page.openPlaylist(id)
  }
  async function folderContextMenu(folderId: string) {
    const clickedId = await ipcRenderer.invoke('showPlaylistMenu')
    if (clickedId === null) return
    if (clickedId === 'New Playlist') {
      openNewPlaylistModal(folderId, false)
    } else if (clickedId === 'New Playlist Folder') {
      openNewPlaylistModal(folderId, true)
    } else {
      console.error('Unknown contextMenu ID', clickedId)
    }
  }

  function hasShowingChildren(id: string) {
    const list = $trackLists[id]
    return list.type === 'folder' && $shownFolders.has(id) && list.children.length >= 1
  }

  let itemChildren: SvelteComponent[] = []
  const dispatch = createEventDispatcher()
  export function selectFirst() {
    if (childLists[0]) {
      open(childLists[0].id)
    }
  }
  export function selectLast() {
    if (childLists[childLists.length - 1]) {
      open(childLists[childLists.length - 1].id)
    }
  }
  async function selectUp(i: number) {
    const prevId = trackList.children[i - 1] || null
    if (i === 0) {
      dispatch('selectUp')
    } else if (prevId && hasShowingChildren(prevId)) {
      itemChildren[i - 1].selectLast()
    } else if (prevId) {
      open(prevId)
    }
  }
  async function selectDown(i: number) {
    if (hasShowingChildren(trackList.children[i])) {
      itemChildren[i].selectFirst()
    } else if (trackList.children[i + 1]) {
      open(trackList.children[i + 1])
    } else {
      dispatch('selectDown')
    }
  }

  export function arrowUpDown(key: 'ArrowUp' | 'ArrowDown') {
    const index = trackList.children.findIndex((id) => id === $page.tracklist.id)
    if (index < 0) {
      return
    }
    if (key === 'ArrowUp') {
      selectUp(index)
    } else {
      selectDown(index)
    }
  }
  $: if (trackList.children.includes($page.id)) {
    const itemHandle = getContext<Writable<SidebarItemHandle | null>>('itemHandle')
    itemHandle.set({ arrowUpDown })
  }
</script>

{#each childLists as childList, i}
  {#if childList.type === 'folder'}
    <div
      class="item"
      style:padding-left={14 * level + 'px'}
      class:active={$page.id === childList.id}
      class:show={$shownFolders.has(childList.id)}
      on:mousedown={() => open(childList.id)}
      on:contextmenu={() => folderContextMenu(childList.id)}
    >
      <svg
        class="arrow"
        on:mousedown|stopPropagation
        on:click={() => {
          if ($shownFolders.has(childList.id)) {
            hideFolder(childList.id)
          } else {
            showFolder(childList.id)
          }
        }}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
      >
        <path d="M21 12l-18 12v-24z" />
      </svg>
      <div class="text">{childList.name}</div>
    </div>
    <div class="sub" class:show={$shownFolders.has(childList.id)}>
      <svelte:self
        bind:this={itemChildren[i]}
        trackList={childList}
        level={level + 1}
        on:selectUp={() => {
          open(childList.id)
        }}
        on:selectDown={() => {
          if (i < trackList.children.length - 1) {
            open(trackList.children[i + 1])
          } else {
            dispatch('selectDown')
          }
        }}
      />
    </div>
  {:else if childList.type === 'playlist'}
    <div
      class="item"
      on:mousedown={() => open(childList.id)}
      class:active={$page.id === childList.id}
    >
      <div class="arrow" />
      <div class="text" style:padding-left={14 * level + 'px'}>{childList.name}</div>
    </div>
  {:else}
    <div
      class="item"
      style:padding-left={14 * level + 'px'}
      on:mousedown={() => open(childList.id)}
      class:active={$page.id === childList.id}
    >
      <div class="arrow" />
      <div class="text">
        {#if childList.id === 'root'}
          Songs
        {:else}
          {childList.name}
        {/if}
      </div>
    </div>
  {/if}
{/each}

<style lang="sass">
  .active
    // box-shadow: inset 2px 0px 0px 0px hsl(var(--hue), 70%, 60%)
    // background: linear-gradient(90deg, hsl(var(--hue), 35%, 25%) 30%, #ffffff00)

    box-shadow: inset 2px 0px 0px 0px hsl(var(--hue), 30%, 60%)
    background-image: linear-gradient(90deg, hsl(var(--hue), 20%, 25%) 30%, #ffffff00)

  :global(:focus)
    .active
      box-shadow: inset 2px 0px 0px 0px hsl(var(--hue), 70%, 60%)
      background-image: linear-gradient(90deg, hsl(var(--hue), 45%, 30%) 30%, #ffffff00)
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
  .sub
    display: none
    &.show
      display: block
  .arrow
    margin-left: 2px
    padding: 6px
    width: 6px
    height: 6px
    flex-shrink: 0
    fill: white
    transition: 120ms transform cubic-bezier(0, 0.02, 0.2, 1)
  .show > svg.arrow
    transform: rotate(90deg)
  .text
    overflow: hidden
    text-overflow: ellipsis
    padding-right: 10px
</style>
