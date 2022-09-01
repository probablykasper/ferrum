<script lang="ts" context="module">
  import { trackLists, page, methods, addTracksToPlaylist, movePlaylist } from '../lib/data'

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
  import { Writable, writable } from 'svelte/store'
  import { createEventDispatcher, SvelteComponent } from 'svelte'
  import { getContext } from 'svelte'
  import { dragged } from '../lib/drag-drop'
  import * as dragGhost from './DragGhost.svelte'
  import { showTracklistMenu } from '@/lib/menus'

  export let parentId: string | null
  export let show = true
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
  async function tracklistContextMenu(id: string, isFolder: boolean) {
    showTracklistMenu({ id, isFolder, isRoot: false })
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

  let dragTrackOntoIndex = null as number | null
  let dragPlaylistOntoIndex = null as number | null

  let dragPlaylistId: string | null = null
  function onDragStart(e: DragEvent, tracklist: TrackList) {
    if (e.dataTransfer && tracklist.type !== 'special' && parentId) {
      e.dataTransfer.effectAllowed = 'move'
      dragPlaylistId = tracklist.id
      dragGhost.setInnerText(tracklist.name)
      dragged.playlist = {
        id: dragPlaylistId,
        fromFolder: parentId,
        level,
      }
      e.dataTransfer.setDragImage(dragGhost.dragEl, 0, 0)
      e.dataTransfer.setData('ferrum.playlist', '')
    }
  }
</script>

<div class="sub" class:show>
  {#each childLists as childList, i}
    {#if childList.type === 'folder'}
      <div
        class="item"
        style:padding-left={14 * level + 'px'}
        class:active={$page.id === childList.id}
        draggable="true"
        on:dragstart={(e) => onDragStart(e, childList)}
        class:show={$shownFolders.has(childList.id)}
        class:droppable={dragPlaylistOntoIndex === i}
        on:drop={(e) => {
          if (
            e.currentTarget &&
            e.dataTransfer?.types[0] === 'ferrum.playlist' &&
            dragged.playlist &&
            level <= dragged.playlist.level &&
            dragged.playlist.id !== childList.id
          ) {
            movePlaylist(dragged.playlist.id, dragged.playlist.fromFolder, childList.id)
          }
          dragPlaylistOntoIndex = null
        }}
        on:mousedown={() => open(childList.id)}
        on:contextmenu={() => tracklistContextMenu(childList.id, true)}
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
        <div
          class="text"
          on:dragover={(e) => {
            if (
              e.currentTarget &&
              e.dataTransfer?.types[0] === 'ferrum.playlist' &&
              dragged.playlist &&
              level <= dragged.playlist.level &&
              dragged.playlist.id !== childList.id
            ) {
              dragPlaylistOntoIndex = i
              e.preventDefault()
            }
          }}
          on:dragleave|self={() => {
            dragPlaylistOntoIndex = null
          }}
        >
          {childList.name}
        </div>
      </div>
      <svelte:self
        bind:this={itemChildren[i]}
        show={$shownFolders.has(childList.id)}
        trackList={childList}
        parentId={childList.id}
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
    {:else if childList.type === 'playlist'}
      <div
        class="item"
        style:padding-left={14 * level + 'px'}
        draggable="true"
        on:dragstart={(e) => onDragStart(e, childList)}
        class:active={$page.id === childList.id}
        on:mousedown={() => open(childList.id)}
        class:droppable={dragTrackOntoIndex === i}
        on:drop={(e) => {
          if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.tracks' && dragged.tracks) {
            addTracksToPlaylist(childList.id, dragged.tracks.ids)
          }
          dragTrackOntoIndex = null
        }}
        on:contextmenu={() => tracklistContextMenu(childList.id, false)}
      >
        <div class="arrow" />
        <div
          class="text"
          on:dragover={(e) => {
            if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.tracks') {
              dragTrackOntoIndex = i
              e.preventDefault()
            }
          }}
          on:dragleave|self={() => {
            dragTrackOntoIndex = null
          }}
        >
          {childList.name}
        </div>
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
</div>

<style lang="sass">
  .item.active
    // box-shadow: inset 2px 0px 0px 0px hsl(var(--hue), 70%, 60%)
    // background: linear-gradient(90deg, hsl(var(--hue), 35%, 25%) 30%, transparent)
    box-shadow: inset 2px 0px 0px 0px hsl(var(--hue), 30%, 60%)
    background-image: linear-gradient(90deg, hsl(var(--hue), 20%, 25%) 30%, transparent 66.6666%)
    background-position: 0% 0%
  :global(:focus)
    .active
      box-shadow: inset 2px 0px 0px 0px hsl(var(--hue), 70%, 60%)
      background-image: linear-gradient(90deg, hsl(var(--hue), 45%, 30%) 30%, transparent 66.6666%)
      background-position: 0% 0%
  .item
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    display: flex
    align-items: center
    margin-right: 10px
    box-sizing: border-box
    z-index: 1
    background-position: 100% 0%
    background-size: 150% 150%
    transition: 260ms background-position cubic-bezier(0, 0.02, 0.2, 1)
  .item.droppable .text
    border-radius: 6px
    box-shadow: inset 0px 0px 0px 2px var(--accent-1)
    background-color: hsla(var(--hue), 74%, 53%, 0.25)
  .sub
    display: none
    &.show
      display: block
  .arrow
    margin-left: 2px
    margin-right: -8px
    padding: 6px
    width: 6px
    height: 6px
    z-index: 1
    flex-shrink: 0
    fill: white
    transition: 120ms transform cubic-bezier(0, 0.02, 0.2, 1)
  .show > svg.arrow
    transform: rotate(90deg)
  .text
    overflow: hidden
    text-overflow: ellipsis
    padding-right: 10px
    padding-left: 8px
    height: 24px
    line-height: 24px
    flex-grow: 1
    position: relative
</style>
