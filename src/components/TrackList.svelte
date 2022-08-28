<script lang="ts">
  import VList from './VirtualList.svelte'
  import {
    page,
    softRefreshPage,
    removeFromOpenPlaylist,
    filter,
    trackLists as trackListsStore,
    addTracksToPlaylist,
    deleteTracksInOpen,
    paths,
  } from '../lib/data'
  import { newPlaybackInstance, playingId } from '../lib/player'
  import {
    getDuration,
    formatDate,
    checkMouseShortcut,
    checkShortcut,
    flattenChildLists,
  } from '../lib/helpers'
  import { newSelection } from '../lib/selection'
  import { showMessageBox } from '../lib/window'
  import { open as openTrackInfo } from './TrackInfo.svelte'
  import { appendToUserQueue, prependToUserQueue } from '../lib/queue'
  import { ipcRenderer } from '../lib/window'
  import type { TrackID, Special, Track } from '../lib/libraryTypes'
  import { onDestroy, onMount } from 'svelte'
  import { dragged } from '../lib/drag-drop'

  export async function showTrackMenu(ids: TrackID[], indexes: number[]) {
    const trackLists = $trackListsStore
    const flat = flattenChildLists(trackLists.root as Special, trackLists, '', 'add-to-')

    const clickedId = await ipcRenderer.invoke('showTrackMenu', flat)
    if (clickedId === null) return
    if (clickedId === 'Play Next') {
      prependToUserQueue(ids)
    } else if (clickedId === 'Add to Queue') {
      appendToUserQueue(ids)
    } else if (clickedId.startsWith('add-to-')) {
      const pId = clickedId.substring('add-to-'.length)
      addTracksToPlaylist(pId, ids)
    } else if (clickedId === 'Remove from Playlist') {
      if ($page.tracklist.type === 'playlist') {
        removeFromOpenPlaylist(indexes)
      }
    } else if (clickedId === 'revealTrackFile') {
      const track = page.getTrack(indexes[0])
      ipcRenderer.invoke('revealTrackFile', paths.tracks_dir, track.file)
    } else if (clickedId === 'Get Info') {
      openTrackInfo(page.getTrackIds(), indexes[0])
    } else {
      console.error('Unknown contextMenu ID', clickedId)
    }
  }

  function playNext() {
    const indexes = selection.getSelectedIndexes($selection)
    const ids = indexes.map((i) => page.getTrackId(i))
    prependToUserQueue(ids)
  }
  function addToQueue() {
    const indexes = selection.getSelectedIndexes($selection)
    const ids = indexes.map((i) => page.getTrackId(i))
    appendToUserQueue(ids)
  }
  function getInfo() {
    const index = selection.findFirst($selection.list)
    if (index !== null) {
      openTrackInfo(page.getTrackIds(), index)
    }
  }
  function revealTrackFile() {
    const index = selection.findFirst($selection.list)
    if (index !== null) {
      let firstIndex = selection.findFirst($selection.list) || 0
      const track = page.getTrack(firstIndex)
      ipcRenderer.invoke('revealTrackFile', paths.tracks_dir, track.file)
    }
  }
  function removeFromPlaylist() {
    if ($page.tracklist.type === 'playlist') {
      const indexes = selection.getSelectedIndexes($selection)
      removeFromOpenPlaylist(indexes)
    }
  }
  function deleteFromLibrary() {
    const indexes = selection.getSelectedIndexes($selection)
    deleteTracksInOpen(indexes)
  }
  onMount(() => {
    ipcRenderer.on('Play Next', playNext)
    ipcRenderer.on('Add to Queue', addToQueue)
    ipcRenderer.on('Get Info', getInfo)
    ipcRenderer.on('revealTrackFile', revealTrackFile)
    ipcRenderer.on('Remove from Playlist', removeFromPlaylist)
    ipcRenderer.on('Delete from Library', deleteFromLibrary)
  })
  onDestroy(() => {
    ipcRenderer.off('Play Next', playNext)
    ipcRenderer.off('Add to Queue', addToQueue)
    ipcRenderer.off('Get Info', getInfo)
    ipcRenderer.off('revealTrackFile', revealTrackFile)
    ipcRenderer.off('Remove from Playlist', removeFromPlaylist)
    ipcRenderer.off('Delete from Library', deleteFromLibrary)
  })

  const sortBy = page.sortBy
  $: sortKey = $page.sort_key

  const selection = newSelection()

  let possibleRowClick = false
  function rowMouseDown(e: MouseEvent, index: number, ctx = false) {
    if (e.button !== 0 && !ctx) return
    const isSelected = $selection.list[index]
    if (isSelected) {
      possibleRowClick = true
    }
    if (checkMouseShortcut(e) && !isSelected) {
      selection.clear()
      selection.add(index)
    } else if (checkMouseShortcut(e, { cmdOrCtrl: true }) && !isSelected) {
      selection.add(index)
    } else if (checkMouseShortcut(e, { shift: true })) {
      selection.shiftSelectTo(index)
    }
  }
  function rowClick(e: MouseEvent, index: number) {
    if (possibleRowClick && e.button === 0) {
      if (checkMouseShortcut(e)) {
        selection.clear()
        selection.add(index)
      } else if (checkMouseShortcut(e, { cmdOrCtrl: true })) {
        selection.toggle(index)
      }
    }
    possibleRowClick = false
  }
  function doubleClick(e: MouseEvent, index: number) {
    if (e.button === 0 && checkMouseShortcut(e)) {
      playRow(index)
    }
  }
  function onContextMenu(e: MouseEvent, index: number) {
    rowMouseDown(e, index, true)
    const indexes = selection.getSelectedIndexes($selection)
    const ids = indexes.map((i) => page.getTrackId(i))
    showTrackMenu(ids, indexes)
  }
  async function keydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'Enter')) {
      let firstIndex = selection.findFirst($selection.list) || 0
      playRow(firstIndex)
    } else if (
      checkShortcut(e, 'Backspace') &&
      $selection.count > 0 &&
      !$filter &&
      $page.tracklist.type === 'playlist'
    ) {
      e.preventDefault()
      const s = $selection.count > 1 ? 's' : ''
      const result = showMessageBox({
        type: 'info',
        message: `Remove ${$selection.count} song${s} from the list?`,
        buttons: ['Remove Song' + s, 'Cancel'],
        defaultId: 0,
      })
      const indexes = []
      for (let i = 0; i < $selection.list.length; i++) {
        if ($selection.list[i]) {
          indexes.push(i)
        }
      }
      if ((await result).buttonClicked === 0) {
        removeFromOpenPlaylist(indexes)
      }
    } else if (checkShortcut(e, 'Backspace', { cmdOrCtrl: true }) && $selection.count > 0) {
      e.preventDefault()
      const s = $selection.count > 1 ? 's' : ''
      const result = showMessageBox({
        type: 'info',
        message: `Delete ${$selection.count} song${s} from library?`,
        buttons: [`Delete Song${s}`, 'Cancel'],
        defaultId: 0,
      })
      const indexes = []
      for (let i = 0; i < $selection.list.length; i++) {
        if ($selection.list[i]) {
          indexes.push(i)
        }
      }
      if ((await result).buttonClicked === 0) {
        deleteTracksInOpen(indexes)
      }
    } else if (checkShortcut(e, 'Escape')) {
      selection.clear()
    } else if (checkShortcut(e, 'ArrowUp')) {
      selection.goBackward($page.length - 1)
      vlist.scrollToItem($selection.lastAdded || 0)
    } else if (checkShortcut(e, 'ArrowUp', { shift: true })) {
      selection.shiftSelectBackward()
      vlist.scrollToItem($selection.lastAdded || 0)
    } else if (checkShortcut(e, 'ArrowUp', { alt: true })) {
      selection.clear()
      selection.add(0)
      vlist.scrollToItem(0)
    } else if (checkShortcut(e, 'ArrowUp', { shift: true, alt: true })) {
      selection.shiftSelectTo(0)
      vlist.scrollToItem($selection.lastAdded || 0)
    } else if (checkShortcut(e, 'ArrowDown')) {
      selection.goForward($page.length - 1)
      vlist.scrollToItem($selection.lastAdded || 0)
    } else if (checkShortcut(e, 'ArrowDown', { shift: true })) {
      selection.shiftSelectForward($page.length - 1)
      vlist.scrollToItem($selection.lastAdded || 0)
    } else if (checkShortcut(e, 'ArrowDown', { alt: true })) {
      selection.clear()
      selection.add($page.length - 1)
      vlist.scrollToItem($selection.lastAdded || 0)
    } else if (checkShortcut(e, 'ArrowDown', { shift: true, alt: true })) {
      selection.shiftSelectTo($page.length - 1)
      vlist.scrollToItem($selection.lastAdded || 0)
    } else if (checkShortcut(e, 'A', { cmdOrCtrl: true })) {
      selection.add(0, $page.length - 1)
    } else {
      return
    }
    e.preventDefault()
  }

  function playRow(index: number) {
    newPlaybackInstance(page.getTrackIds(), index)
  }

  let dragLine: HTMLElement
  let dragging = false
  let indexes: number[] = []
  import * as dragGhost from './DragGhost.svelte'
  function onDragStart(e: DragEvent) {
    if (e.dataTransfer) {
      indexes = []
      for (let i = 0; i < $selection.list.length; i++) {
        if ($selection.list[i]) {
          indexes.push(i)
        }
      }
      dragging = true
      e.dataTransfer.effectAllowed = 'move'
      if (indexes.length === 1) {
        const track = page.getTrack(indexes[0])
        dragGhost.setInnerText(track.artist + ' - ' + track.name)
      } else {
        dragGhost.setInnerText(indexes.length + ' items')
      }
      dragged.tracks.indexes = indexes
      dragged.tracks.ids = indexes.map((i) => page.getTrackId(i))
      e.dataTransfer.setDragImage(dragGhost.dragEl, 0, 0)
      e.dataTransfer.setData('ferrum.tracks', '')
    }
  }
  function globalDragOverHandler(e: DragEvent) {
    if (dragging) e.preventDefault()
  }
  let dragToIndex: null | number = null
  function onDragOver(e: DragEvent, index: number) {
    if (
      !$page.sort_desc ||
      $page.sort_key !== 'index' ||
      $filter ||
      $page.tracklist.type !== 'playlist'
    ) {
      dragToIndex = null
      return
    }
    if (
      dragging &&
      e.currentTarget &&
      e.dataTransfer &&
      e.dataTransfer.types[0] === 'ferrum.tracks'
    ) {
      const rowEl = e.currentTarget as HTMLDivElement
      const dim = rowEl.getBoundingClientRect()
      if (e.offsetY < rowEl.clientHeight / 2) {
        dragLine.style.top = dim.top - 1 + 'px'
        dragToIndex = index
      } else {
        dragLine.style.top = dim.bottom - 1 + 'px'
        dragToIndex = index + 1
      }
    }
  }
  function dragEndHandler() {
    dragging = false
    if (dragToIndex !== null) {
      const newSelection = page.moveTracks(indexes, dragToIndex)
      for (let i = newSelection.from; i <= newSelection.to; i++) {
        selection.add(i)
      }
      dragToIndex = null
    }
  }

  function getItem(index: number) {
    try {
      const track = page.getTrack(index)
      return { ...track, id: page.getTrackId(index) }
    } catch (err) {
      return null
    }
  }

  let vlist: VList<Track>

  let itemCount = 0
  page.subscribe((page) => {
    itemCount = page.length
    if (vlist) vlist.refresh()
    selection.clear()
  })
  softRefreshPage.subscribe(() => {
    if (vlist) vlist.refresh()
  })
</script>

<svelte:window on:dragover={globalDragOverHandler} />

<div class="tracklist" on:dragleave={() => (dragToIndex = null)}>
  <div class="header">
    <div class="dragbar" />
    <h3 class="title">
      {#if $page.tracklist.id === 'root'}
        Songs
      {:else if $page.tracklist.type !== 'special'}
        {$page.tracklist.name}
      {/if}
    </h3>
    <div class="info">{$page.length} songs</div>
    {#if 'description' in $page.tracklist}
      <div class="description">{$page.tracklist.description}</div>
    {/if}
  </div>
  <div class="row table-header" class:desc={$page.sort_desc}>
    <div class="c index" class:sort={sortKey === 'index'} on:click={() => sortBy('index')}>
      <span>#</span>
    </div>
    <div class="c name" class:sort={sortKey === 'name'} on:click={() => sortBy('name')}>
      <span>Name</span>
    </div>
    <div
      class="c playCount"
      class:sort={sortKey === 'playCount'}
      on:click={() => sortBy('playCount')}
    >
      <span>Plays</span>
    </div>
    <div class="c duration" class:sort={sortKey === 'duration'} on:click={() => sortBy('duration')}>
      <span>Time</span>
    </div>
    <div class="c artist" class:sort={sortKey === 'artist'} on:click={() => sortBy('artist')}>
      <span>Artist</span>
    </div>
    <div
      class="c albumName"
      class:sort={sortKey === 'albumName'}
      on:click={() => sortBy('albumName')}
    >
      <span>Album</span>
    </div>
    <div class="c comments" class:sort={sortKey === 'comments'} on:click={() => sortBy('comments')}>
      <span>Comments</span>
    </div>
    <div class="c genre" class:sort={sortKey === 'genre'} on:click={() => sortBy('genre')}>
      <span>Genre</span>
    </div>
    <div
      class="c dateAdded"
      class:sort={sortKey === 'dateAdded'}
      on:click={() => sortBy('dateAdded')}
    >
      <span>Date Added</span>
    </div>
    <div class="c year" class:sort={sortKey === 'year'} on:click={() => sortBy('year')}>
      <span>Year</span>
    </div>
  </div>
  <VList
    {getItem}
    itemHeight={24}
    {itemCount}
    bind:this={vlist}
    on:keydown={keydown}
    on:mousedown-self={selection.clear}
    let:item={track}
    let:index
  >
    {#if track !== null}
      <div
        class="row"
        on:dblclick={(e) => doubleClick(e, index)}
        on:mousedown={(e) => rowMouseDown(e, index)}
        on:click={(e) => rowClick(e, index)}
        on:contextmenu={(e) => onContextMenu(e, index)}
        draggable="true"
        on:dragstart={onDragStart}
        on:dragover={(e) => onDragOver(e, index)}
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
  </VList>
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
        font-weight: 600
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
        min-width: 40px
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
