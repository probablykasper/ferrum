<script lang="ts" context="module">
  import {
    trackListsDetailsMap,
    page,
    methods,
    addTracksToPlaylist,
    movePlaylist,
  } from '../lib/data'

  export type SidebarItemHandle = {
    handleKey(e: KeyboardEvent): void
  }

  let shownFolders = writable(new Set(methods.shownPlaylistFolders()))
  function showFolder(id: string) {
    shownFolders.update((folders) => {
      folders.add(id)
      return folders
    })
    methods.viewFolderSetShow(id, true)
  }
  function hideFolder(id: string) {
    shownFolders.update((folders) => {
      folders.delete(id)
      return folders
    })
    methods.viewFolderSetShow(id, false)
  }
</script>

<script lang="ts">
  import type { TrackListDetails } from '../../ferrum-addon'
  import { type Writable, writable } from 'svelte/store'
  import { createEventDispatcher } from 'svelte'
  import { getContext } from 'svelte'
  import { dragged } from '../lib/drag-drop'
  import * as dragGhost from './DragGhost.svelte'
  import { ipcRenderer } from '@/lib/window'
  import { checkShortcut } from '@/lib/helpers'

  export let parentId: string | null
  export let show = true
  export let trackList: { children: string[] }
  export let preventDrop = false

  export let level = 0
  $: childLists = trackList.children.map((childId) => {
    return $trackListsDetailsMap[childId]
  })
  function open(id: string) {
    if ($page.id !== id) page.openPlaylist(id)
  }
  async function tracklistContextMenu(id: string, isFolder: boolean) {
    await ipcRenderer.invoke('showTracklistMenu', { id, isFolder, isRoot: false })
  }

  function hasShowingChildren(id: string) {
    const list = $trackListsDetailsMap[id]
    return list.children && list.children.length > 0 && $shownFolders.has(id)
  }

  const dispatch = createEventDispatcher<{ selectDown: null }>()
  function selectFirst(in_id: string) {
    const children = $trackListsDetailsMap[in_id].children
    if (children && children[0]) {
      open(children[0])
    }
  }
  function selectLast(in_id: string) {
    const children = $trackListsDetailsMap[in_id].children
    if (children && (hasShowingChildren(in_id) || in_id === 'root')) {
      selectLast(children[children.length - 1])
    } else {
      open(in_id)
    }
  }
  function selectUp(i: number) {
    const prevId = trackList.children[i - 1] || null
    if (i === 0 && parentId) {
      open(parentId)
    } else if (prevId && hasShowingChildren(prevId)) {
      selectLast(prevId)
    } else if (prevId) {
      open(prevId)
    }
  }
  function selectDown(i: number) {
    if (hasShowingChildren(trackList.children[i])) {
      selectFirst(trackList.children[i])
    } else if (trackList.children[i + 1]) {
      open(trackList.children[i + 1])
    } else {
      dispatch('selectDown')
    }
  }

  export function handleKey(e: KeyboardEvent) {
    const index = trackList.children.findIndex((id) => id === $page.tracklist.id)
    if (index < 0) {
      return
    }
    const selectedList = $trackListsDetailsMap[$page.tracklist.id]
    if (checkShortcut(e, 'ArrowUp')) {
      selectUp(index)
    } else if (checkShortcut(e, 'ArrowUp', { alt: true })) {
      open('root')
    } else if (checkShortcut(e, 'ArrowDown', { alt: true })) {
      selectLast('root')
    } else if (checkShortcut(e, 'ArrowDown')) {
      selectDown(index)
    } else if (checkShortcut(e, 'ArrowLeft')) {
      if (selectedList.kind === 'folder' && $shownFolders.has(selectedList.id)) {
        hideFolder(selectedList.id)
      } else if (parentId) {
        open(parentId)
      }
    } else if (checkShortcut(e, 'ArrowRight') && selectedList.kind === 'folder') {
      showFolder(selectedList.id)
    } else {
      return
    }
    e.preventDefault()
  }
  $: if (trackList.children.includes($page.id)) {
    const itemHandle = getContext<Writable<SidebarItemHandle | null>>('itemHandle')
    itemHandle.set({ handleKey })
  }

  let dragTrackOntoIndex = null as number | null
  let dropAbove = false
  let dragPlaylistOntoIndex = null as number | null

  function onDragStart(e: DragEvent, tracklist: TrackListDetails) {
    if (e.dataTransfer && tracklist.kind !== 'special' && parentId) {
      e.dataTransfer.effectAllowed = 'move'
      dragGhost.setInnerText(tracklist.name)
      dragged.playlist = {
        id: tracklist.id,
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
    {#if childList.kind === 'folder'}
      <div
        class="item"
        style:padding-left={14 * level + 'px'}
        class:active={$page.id === childList.id}
        draggable="true"
        on:dragstart={(e) => onDragStart(e, childList)}
        class:show={$shownFolders.has(childList.id)}
        class:droppable={dragPlaylistOntoIndex === i}
        role="none"
        on:drop={(e) => {
          if (
            e.currentTarget &&
            e.dataTransfer?.types[0] === 'ferrum.playlist' &&
            dragged.playlist &&
            !preventDrop &&
            dragged.playlist.id !== childList.id &&
            childList.children !== undefined
          ) {
            movePlaylist(
              dragged.playlist.id,
              dragged.playlist.fromFolder,
              childList.id,
              childList.children.length - 1,
            )
            dragPlaylistOntoIndex = null
          }
        }}
        on:mousedown={() => open(childList.id)}
        on:contextmenu={() => tracklistContextMenu(childList.id, true)}
      >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-interactive-supports-focus -->
        <svg
          class="arrow"
          role="button"
          aria-label="Arrow button"
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
        <!-- svelte-ignore a11y-interactive-supports-focus -->
        <div
          class="text"
          role="link"
          on:dragover={(e) => {
            if (
              e.currentTarget &&
              e.dataTransfer?.types[0] === 'ferrum.playlist' &&
              dragged.playlist &&
              !preventDrop &&
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
        show={$shownFolders.has(childList.id)}
        trackList={childList}
        parentId={childList.id}
        level={level + 1}
        preventDrop={preventDrop || dragged.playlist?.id === childList.id}
        on:selectDown={() => {
          if (i < trackList.children.length - 1) {
            open(trackList.children[i + 1])
          } else {
            dispatch('selectDown')
          }
        }}
      />
    {:else if childList.kind === 'playlist'}
      <!-- svelte-ignore a11y-interactive-supports-focus -->
      <div
        class="item"
        role="button"
        aria-label="playlist"
        style:padding-left={14 * level + 'px'}
        draggable="true"
        on:dragstart={(e) => onDragStart(e, childList)}
        class:active={$page.id === childList.id}
        on:mousedown={() => open(childList.id)}
        class:droppable={dragTrackOntoIndex === i}
        class:droppable-above={dragPlaylistOntoIndex === i && dropAbove}
        class:droppable-below={dragPlaylistOntoIndex === i && !dropAbove}
        on:drop={(e) => {
          if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.tracks' && dragged.tracks) {
            addTracksToPlaylist(childList.id, dragged.tracks.ids)
            dragTrackOntoIndex = null
          } else if (
            e.currentTarget &&
            e.dataTransfer?.types[0] === 'ferrum.playlist' &&
            dragged.playlist &&
            !preventDrop &&
            parentId !== null
          ) {
            const rect = e.currentTarget.getBoundingClientRect()
            dropAbove = e.pageY < rect.bottom - rect.height / 2
            movePlaylist(
              dragged.playlist.id,
              dragged.playlist.fromFolder,
              parentId,
              dropAbove ? i : i + 1,
            )
            dragPlaylistOntoIndex = null
          }
        }}
        on:contextmenu={() => tracklistContextMenu(childList.id, false)}
      >
        <div class="arrow" />
        <div
          class="text"
          role="link"
          on:dragover={(e) => {
            if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.tracks' && dragged.tracks) {
              dragTrackOntoIndex = i
              e.preventDefault()
            } else if (
              e.currentTarget &&
              e.dataTransfer?.types[0] === 'ferrum.playlist' &&
              dragged.playlist &&
              !preventDrop
            ) {
              dragPlaylistOntoIndex = i
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              dropAbove = e.pageY < rect.bottom - rect.height / 2
            }
          }}
          on:dragleave|self={() => {
            dragTrackOntoIndex = null
            dragPlaylistOntoIndex = null
          }}
        >
          {childList.name}
        </div>
      </div>
    {:else}
      <!-- svelte-ignore a11y-interactive-supports-focus -->
      <div
        class="item"
        role="link"
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
  :global(aside :focus)
    .active
      box-shadow: inset 2px 0px 0px 0px hsl(var(--hue), 70%, 60%)
      background-image: linear-gradient(90deg, hsl(var(--hue), 45%, 30%) 30%, transparent 66.6666%)
      background-position: 0% 0%
  .item
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
  .item.droppable-above .text
    box-shadow: 0px -1px 0px 0px var(--accent-1), inset 0px 1px 0px 0px var(--accent-1)
  .item.droppable-below .text
    box-shadow: 0px 1px 0px 0px var(--accent-1), inset 0px -1px 0px 0px var(--accent-1)
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
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    padding-right: 10px
    padding-left: 8px
    height: 24px
    line-height: 24px
    flex-grow: 1
    position: relative
</style>
