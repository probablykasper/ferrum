<script lang="ts">
  import { page, removeFromOpenPlaylist, filter, deleteTracksInOpen, paths } from '../lib/data'
  import VirtualList from './VirtualList.svelte'
  import { newPlaybackInstance, playingId } from '../lib/player'
  import {
    getDuration,
    formatDate,
    checkMouseShortcut,
    checkShortcut,
    assertUnreachable,
  } from '../lib/helpers'
  import { appendToUserQueue, prependToUserQueue } from '../lib/queue'
  import { selection, scrollToIndex, main_area } from '../lib/page'
  import { ipcListen, ipcRenderer } from '../lib/window'
  import { onDestroy } from 'svelte'
  import { dragged } from '../lib/drag-drop'
  import * as dragGhost from './DragGhost.svelte'
  import type { TrackID } from 'ferrum-addon/addon'
  import { modalCount } from './Modal.svelte'

  export let onTrackInfo: (allIds: TrackID[], index: number) => void

  let tracklistElement: HTMLDivElement

  const trackActionUnlisten = ipcListen('selectedTracksAction', (_, action) => {
    let firstIndex = selection.findFirst()
    if (firstIndex === null || !tracklistElement.contains(document.activeElement)) {
      return
    }
    if (action === 'Play Next') {
      const ids = selection.getSelectedIndexes().map((i) => page.getTrackId(i))
      prependToUserQueue(ids)
    } else if (action === 'Add to Queue') {
      const ids = selection.getSelectedIndexes().map((i) => page.getTrackId(i))
      appendToUserQueue(ids)
    } else if (action === 'Get Info') {
      onTrackInfo(page.getTrackIds(), firstIndex)
    } else if (action === 'revealTrackFile') {
      const track = page.getTrack(firstIndex)
      ipcRenderer.invoke('revealTrackFile', paths.tracksDir, track.file)
    } else if (action === 'Remove from Playlist') {
      removeFromOpenPlaylist(selection.getSelectedIndexes())
    } else if (action === 'Delete from Library') {
      deleteIndexes(selection.getSelectedIndexes())
    } else {
      assertUnreachable(action)
    }
  })
  onDestroy(trackActionUnlisten)

  const sortBy = page.sortBy
  $: sortKey = $page.sortKey

  ipcRenderer.on('Group Album Tracks', (_, checked) => {
    page.set_group_album_tracks(checked)
  })

  $: if ($scrollToIndex !== null) {
    virtualList.scrollToItem($scrollToIndex)
  }

  function doubleClick(e: MouseEvent, index: number) {
    if (e.button === 0 && checkMouseShortcut(e)) {
      playRow(index)
    }
  }
  async function deleteIndexes(indexes: number[]) {
    const s = $selection.count > 1 ? 's' : ''
    const result = await ipcRenderer.invoke('showMessageBox', false, {
      type: 'info',
      message: `Delete ${$selection.count} song${s} from library?`,
      buttons: [`Delete Song${s}`, 'Cancel'],
      defaultId: 0,
    })
    if (result.response === 0) {
      deleteTracksInOpen(indexes)
    }
  }
  async function keydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'Enter')) {
      let firstIndex = selection.findFirst()
      if (firstIndex !== null) {
        playRow(firstIndex)
      } else if (!$playingId) {
        playRow(0)
      }
    } else if (
      checkShortcut(e, 'Backspace') &&
      $selection.count > 0 &&
      !$filter &&
      $page.tracklist.type === 'playlist'
    ) {
      e.preventDefault()
      const s = $selection.count > 1 ? 's' : ''
      const result = ipcRenderer.invoke('showMessageBox', false, {
        type: 'info',
        message: `Remove ${$selection.count} song${s} from the list?`,
        buttons: ['Remove Song' + s, 'Cancel'],
        defaultId: 0,
      })
      const indexes = selection.getSelectedIndexes()
      if ((await result).response === 0) {
        removeFromOpenPlaylist(indexes)
      }
    } else if (checkShortcut(e, 'Backspace', { cmdOrCtrl: true }) && $selection.count > 0) {
      e.preventDefault()
      deleteIndexes(selection.getSelectedIndexes())
    } else {
      selection.handleKeyDown(e)
      return
    }
    e.preventDefault()
  }

  function playRow(index: number) {
    newPlaybackInstance(page.getTrackIds(), index)
  }

  let dragLine: HTMLElement
  let dragIndexes: number[] = []
  function onDragStart(e: DragEvent) {
    if (e.dataTransfer) {
      dragIndexes = []
      for (let i = 0; i < $selection.list.length; i++) {
        if ($selection.list[i]) {
          dragIndexes.push(i)
        }
      }
      e.dataTransfer.effectAllowed = 'move'
      if (dragIndexes.length === 1) {
        const track = page.getTrack(dragIndexes[0])
        dragGhost.setInnerText(track.artist + ' - ' + track.name)
      } else {
        dragGhost.setInnerText(dragIndexes.length + ' items')
      }
      dragged.tracks = {
        ids: dragIndexes.map((i) => page.getTrackId(i)),
        playlistIndexes: dragIndexes,
      }
      e.dataTransfer.setDragImage(dragGhost.dragEl, 0, 0)
      e.dataTransfer.setData('ferrum.tracks', '')
    }
  }
  let dragToIndex: null | number = null
  function onDragOver(e: DragEvent, index: number) {
    if (
      !$page.sortDesc ||
      $page.sortKey !== 'index' ||
      $filter ||
      $page.tracklist.type !== 'playlist'
    ) {
      dragToIndex = null
      return
    }
    if (
      dragged.tracks?.playlistIndexes &&
      e.currentTarget &&
      e.dataTransfer?.types[0] === 'ferrum.tracks'
    ) {
      e.preventDefault()
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      if (e.pageY < rect.bottom - rect.height / 2) {
        dragLine.style.top = rect.top - 1 + 'px'
        dragToIndex = index
      } else {
        dragLine.style.top = rect.bottom - 1 + 'px'
        dragToIndex = index + 1
      }
    }
  }
  async function dropHandler() {
    if (dragToIndex !== null) {
      page.moveTracks(dragIndexes, dragToIndex)
      dragToIndex = null
    }
  }
  function dragEndHandler() {
    dragToIndex = null
  }

  function getItem(index: number) {
    try {
      const track = page.getTrack(index)
      return { ...track, id: page.getTrackId(index) }
    } catch (err) {
      return null
    }
  }

  let virtualList: VirtualList<ReturnType<typeof getItem>>

  $: if (virtualList) {
    main_area.focus = virtualList.focus
  }

  $: if ($page && virtualList) {
    virtualList.refresh()
  }

  function electronDragRegion(el: HTMLElement) {
    const unsubscribe = modalCount.subscribe((count) => {
      if (count === 0) {
        el.style.setProperty('-webkit-app-region', 'drag')
      } else {
        el.style.setProperty('-webkit-app-region', 'no-drag')
      }
    })
    return {
      destroy() {
        unsubscribe()
      },
    }
  }
</script>

<div
  bind:this={tracklistElement}
  class="tracklist"
  role="table"
  on:dragleave={() => (dragToIndex = null)}
  class:no-selection={$selection.count === 0}
>
  <div class="header">
    <div class="dragbar" use:electronDragRegion />
    <h3 class="title">
      {#if $page.tracklist.id === 'root'}
        Songs
      {:else if $page.tracklist.type !== 'special'}
        {$page.tracklist.name}
      {/if}
    </h3>
    <div class="info">{$page.length} songs</div>
    {#if 'description' in $page.tracklist && $page.tracklist.description !== ''}
      <div class="description">{$page.tracklist.description}</div>
    {/if}
  </div>
  <div class="row table-header" class:desc={$page.sortDesc} role="row">
    <!-- svelte-ignore a11y-interactive-supports-focus -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="c index"
      class:sort={sortKey === 'index'}
      on:click={() => sortBy('index')}
      role="button"
    >
      <span>#</span>
    </div>
    <!-- svelte-ignore a11y-interactive-supports-focus -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="c name"
      class:sort={sortKey === 'name'}
      on:click={() => sortBy('name')}
      role="button"
    >
      <span>Name</span>
    </div>
    <!-- svelte-ignore a11y-interactive-supports-focus -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="c playCount"
      class:sort={sortKey === 'playCount'}
      on:click={() => sortBy('playCount')}
      role="button"
    >
      <span>Plays</span>
    </div>
    <!-- svelte-ignore a11y-interactive-supports-focus -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="c duration"
      class:sort={sortKey === 'duration'}
      on:click={() => sortBy('duration')}
      role="button"
    >
      <span>Time</span>
    </div>
    <!-- svelte-ignore a11y-interactive-supports-focus -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="c artist"
      class:sort={sortKey === 'artist'}
      on:click={() => sortBy('artist')}
      role="button"
    >
      <span>Artist</span>
    </div>
    <!-- svelte-ignore a11y-interactive-supports-focus -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="c albumName"
      class:sort={sortKey === 'albumName'}
      on:click={() => sortBy('albumName')}
      role="button"
    >
      <span>Album</span>
    </div>
    <!-- svelte-ignore a11y-interactive-supports-focus -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="c comments"
      class:sort={sortKey === 'comments'}
      on:click={() => sortBy('comments')}
      role="button"
    >
      <span>Comments</span>
    </div>
    <!-- svelte-ignore a11y-interactive-supports-focus -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="c genre"
      class:sort={sortKey === 'genre'}
      on:click={() => sortBy('genre')}
      role="button"
    >
      <span>Genre</span>
    </div>
    <!-- svelte-ignore a11y-interactive-supports-focus -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="c dateAdded"
      class:sort={sortKey === 'dateAdded'}
      on:click={() => sortBy('dateAdded')}
      role="button"
    >
      <span>Date Added</span>
    </div>
    <!-- svelte-ignore a11y-interactive-supports-focus -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="c year"
      class:sort={sortKey === 'year'}
      on:click={() => sortBy('year')}
      role="button"
    >
      <span>Year</span>
    </div>
  </div>
  <VirtualList
    {getItem}
    itemHeight={24}
    itemCount={$page.length}
    bind:this={virtualList}
    isMain={-1}
    on:keydown={keydown}
    on:mousedown-self={selection.clear}
    let:item={track}
    let:index
  >
    {#if track !== null}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-interactive-supports-focus -->
      <div
        class="row"
        role="row"
        on:dblclick={(e) => doubleClick(e, index)}
        on:mousedown={(e) => selection.handleMouseDown(e, index)}
        on:contextmenu={(e) => selection.handleContextMenu(e, index)}
        on:click={(e) => selection.handleClick(e, index)}
        draggable="true"
        on:dragstart={onDragStart}
        on:dragover={(e) => onDragOver(e, index)}
        on:drop={dropHandler}
        on:dragend={dragEndHandler}
        class:odd={index % 2 === 0}
        class:selected={$selection.list[index] === true}
        class:playing={track.id === $playingId}
      >
        <div class="c index">
          {#if track.id === $playingId}
            <svg
              class="playing-icon"
              xmlns="http://www.w3.org/2000/svg"
              height="24"
              viewBox="0 0 24 24"
              width="24"
            >
              <path d="M0 0h24v24H0z" fill="none" />
              <path
                d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
              />
            </svg>
          {:else}
            {index + 1}
          {/if}
        </div>
        <div class="c name">{track.name}</div>
        <div class="c playCount">{track.playCount || ''}</div>
        <div class="c duration">{track.duration ? getDuration(track.duration) : ''}</div>
        <div class="c artist">{track.artist}</div>
        <div class="c albumName">{track.albumName || ''}</div>
        <div class="c comments">{track.comments || ''}</div>
        <div class="c genre">{track.genre || ''}</div>
        <div class="c dateAdded">{formatDate(track.dateAdded)}</div>
        <div class="c year">{track.year || ''}</div>
      </div>
    {/if}
  </VirtualList>
  <div class="drag-line" class:show={dragToIndex !== null} bind:this={dragLine} />
</div>

<style lang="sass">
  .odd
    background-color: hsla(0, 0%, 90%, 0.06)
  .selected
    background-color: hsla(var(--hue), 20%, 42%, 0.8)
  :global(:focus)
    .selected
      background-color: hsla(var(--hue), 70%, 46%, 1)

  .header
    padding-left: 20px
    padding-right: 20px
    padding-top: 15px
    margin-bottom: 20px
    position: relative
  .dragbar
    -webkit-app-region: drag
    position: absolute
    height: 35px
    width: 100%
    top: 0px
    left: 0px
  .title
    margin: 0px
    font-weight: 500
  .info
    font-size: 13px
    opacity: 0.7
  .description
    margin-top: 10px
    font-size: 14px
    opacity: 0.7

  .tracklist
    display: flex
    flex-direction: column
    min-width: 0px
    width: 100%
    background-color: rgba(0, 0, 0, 0.01)
    overflow: hidden
    .table-header
      .c
        overflow: visible
        *
          pointer-events: none
      .c.sort span
        font-weight: 500
      .c.sort span::after
        content: '▲'
        padding-left: 1px
        transform: scale(0.8, 0.5)
        display: inline-block
      &.desc .c.sort span::after
        content: '▼'
    .row
      display: flex
      max-width: 100%
      $row-height: 24px
      height: $row-height
      font-size: 12px
      line-height: $row-height
      box-sizing: border-box
      position: relative
      &.playing.selected
        color: #ffffff
      &.playing
        color: #00ffff
      .c
        display: inline-block
        vertical-align: top
        width: 100%
        white-space: nowrap
        overflow: hidden
        text-overflow: ellipsis
        padding-right: 10px
      &.selected .index svg.playing-icon
          fill: var(--icon-color)
      .index
        width: 0px
        min-width: 36px
        text-align: right
        svg.playing-icon
          fill: #00ffff
          width: 16px
          height: 100%
      .name
        width: 170%
      .playCount
        width: 0px
        min-width: 42px
        text-align: right
      .duration
        width: 0px
        min-width: 40px
        text-align: right
      .artist
        width: 120%
      .albumName
        width: 90%
      .genre
        width: 65%
      .comments
        width: 65%
      .dateAdded
        width: 130px
        min-width: 130px
      .year
        width: 0px
        min-width: 37px
  .drag-line
    position: absolute
    width: 100%
    height: 2px
    background-color: var(--drag-line-color)
    pointer-events: none
    display: none
    &.show
      display: block
</style>
