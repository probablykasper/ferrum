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
  import type { TrackListDetails, ViewAs } from '../../ferrum-addon'
  import { type Writable, writable } from 'svelte/store'
  import { getContext } from 'svelte'
  import { dragged } from '../lib/drag-drop'
  import * as dragGhost from './DragGhost.svelte'
  import { ipcRenderer } from '@/lib/window'
  import { checkShortcut } from '@/lib/helpers'

  export let show = true
  export let parentId: string | null
  export let preventDrop = false
  export let children: (TrackListDetails & { view_as?: ViewAs })[]

  export let level = 0
  export let on_open: (item: { id: string; view_as?: ViewAs }) => void
  async function tracklistContextMenu(id: string, isFolder: boolean) {
    await ipcRenderer.invoke('showTracklistMenu', { id, isFolder, isRoot: false })
  }

  function hasShowingChildren(id: string) {
    const list = $trackListsDetailsMap[id]
    return list.children && list.children.length > 0 && $shownFolders.has(id)
  }

  export let on_select_down = () => {}
  function selectFirst(item: TrackListDetails) {
    const child_id = item.children?.[0]
    if (child_id) {
      on_open($trackListsDetailsMap[child_id])
    }
  }
  function selectLast(in_id: string) {
    const children = $trackListsDetailsMap[in_id].children
    if (children && (hasShowingChildren(in_id) || in_id === 'root')) {
      selectLast(children[children.length - 1])
    } else {
      on_open($trackListsDetailsMap[in_id])
    }
  }
  function selectUp(i: number) {
    const prevId = children[i - 1]?.id || null
    if (i === 0 && parentId) {
      on_open({ id: parentId })
    } else if (prevId && hasShowingChildren(prevId)) {
      selectLast(prevId)
    } else if (prevId) {
      on_open({ id: prevId })
    }
  }
  function selectDown(i: number) {
    if (hasShowingChildren(children[i].id)) {
      selectFirst(children[i])
    } else if (children[i + 1]) {
      console.trace()
      on_open(children[i + 1])
    } else {
      on_select_down()
    }
  }

  export function handleKey(e: KeyboardEvent) {
    const index = children.findIndex((child) => {
      if (child.id === 'root') {
        return child.id === $page.tracklist.id && child.view_as === $page.viewAs
      } else {
        return child.id === $page.tracklist.id
      }
    })
    if (index < 0) {
      return
    }
    const selectedList = $trackListsDetailsMap[$page.tracklist.id]
    if (checkShortcut(e, 'ArrowUp')) {
      selectUp(index)
    } else if (checkShortcut(e, 'ArrowUp', { alt: true })) {
      on_open({ id: 'root' })
    } else if (checkShortcut(e, 'ArrowDown', { alt: true })) {
      selectLast('root')
    } else if (checkShortcut(e, 'ArrowDown')) {
      selectDown(index)
    } else if (checkShortcut(e, 'ArrowLeft')) {
      if (selectedList.kind === 'folder' && $shownFolders.has(selectedList.id)) {
        hideFolder(selectedList.id)
      } else if (parentId) {
        on_open({ id: parentId })
      }
    } else if (checkShortcut(e, 'ArrowRight') && selectedList.kind === 'folder') {
      showFolder(selectedList.id)
    } else {
      return
    }
    e.preventDefault()
  }
  $: if (!!children.find((child) => child.id === $page.id)) {
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
  {#each children as child_list, i}
    {#if child_list.kind === 'folder'}
      <div
        class="item"
        style:padding-left={14 * level + 'px'}
        class:active={$page.id === child_list.id}
        draggable="true"
        on:dragstart={(e) => onDragStart(e, child_list)}
        class:show={$shownFolders.has(child_list.id)}
        class:droppable={dragPlaylistOntoIndex === i}
        role="none"
        on:drop={(e) => {
          if (
            e.currentTarget &&
            e.dataTransfer?.types[0] === 'ferrum.playlist' &&
            dragged.playlist &&
            !preventDrop &&
            dragged.playlist.id !== child_list.id &&
            child_list.children !== undefined
          ) {
            movePlaylist(
              dragged.playlist.id,
              dragged.playlist.fromFolder,
              child_list.id,
              Math.max(0, child_list.children.length - 1),
            )
            dragPlaylistOntoIndex = null
          }
        }}
        on:mousedown={() => on_open(child_list)}
        on:contextmenu={() => tracklistContextMenu(child_list.id, true)}
      >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-interactive-supports-focus -->
        <svg
          class="arrow"
          role="button"
          aria-label="Arrow button"
          on:mousedown|stopPropagation
          on:click={() => {
            if ($shownFolders.has(child_list.id)) {
              hideFolder(child_list.id)
            } else {
              showFolder(child_list.id)
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
              dragged.playlist.id !== child_list.id
            ) {
              dragPlaylistOntoIndex = i
              e.preventDefault()
            }
          }}
          on:dragleave|self={() => {
            dragPlaylistOntoIndex = null
          }}
        >
          {child_list.name}
        </div>
      </div>
      <svelte:self
        show={$shownFolders.has(child_list.id)}
        parentId={child_list.id}
        children={child_list.children?.map((childId) => $trackListsDetailsMap[childId]) || []}
        level={level + 1}
        preventDrop={preventDrop || dragged.playlist?.id === child_list.id}
        {on_open}
        on_select_down={() => {
          if (i < children.length - 1) {
            on_open(children[i + 1])
          } else {
            on_select_down()
          }
        }}
      />
    {:else if child_list.kind === 'playlist'}
      <!-- svelte-ignore a11y-interactive-supports-focus -->
      <div
        class="item"
        role="button"
        aria-label="playlist"
        style:padding-left={14 * level + 'px'}
        draggable="true"
        on:dragstart={(e) => onDragStart(e, child_list)}
        class:active={$page.id === child_list.id}
        on:mousedown={() => on_open(child_list)}
        class:droppable={dragTrackOntoIndex === i}
        class:droppable-above={dragPlaylistOntoIndex === i && dropAbove}
        class:droppable-below={dragPlaylistOntoIndex === i && !dropAbove}
        on:drop={(e) => {
          if (e.currentTarget && e.dataTransfer?.types[0] === 'ferrum.tracks' && dragged.tracks) {
            addTracksToPlaylist(child_list.id, dragged.tracks.ids)
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
        on:contextmenu={() => tracklistContextMenu(child_list.id, false)}
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
          {child_list.name}
        </div>
      </div>
    {:else}
      <!-- svelte-ignore a11y-interactive-supports-focus -->
      <div
        class="item"
        role="link"
        style:padding-left={14 * level + 'px'}
        on:mousedown={() => on_open(child_list)}
        class:active={$page.id === child_list.id &&
          child_list.name === ['Songs', 'Artists'][$page.viewAs]}
      >
        <div class="arrow" />
        <div class="text">
          {child_list.name}
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
    width: 19px
    height: 19px
    z-index: 1
    flex-shrink: 0
    fill: white
    transition: 140ms transform var(--cubic-out)
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
