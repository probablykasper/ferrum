<script lang="ts">
  import VList from './VirtualList.svelte'
  import { page, removeFromOpenPlaylist, filter } from '../stores/data'
  import { newPlaybackInstance, playingId } from '../stores/player'
  import { getDuration, formatDate, checkMouseShortcut } from '../scripts/helpers'
  import { showTrackMenu } from '../stores/contextMenu'
  import { newSelection } from '../stores/selection'
  import { showMessageBox } from '../stores/window'
  import { onMount } from 'svelte'

  const sortBy = page.sortBy
  $: sortKey = $page.sort_key

  let selection = newSelection()
  let possibleRowClick = false
  function rowMouseDown(e: MouseEvent, index: number, ctx = false) {
    if (e.button !== 0 && !ctx) return
    if ($selection.list[index]) {
      possibleRowClick = true
    } else if (checkMouseShortcut(e)) {
      selection.clear()
      selection.add(index)
    } else if (checkMouseShortcut(e, { cmdOrCtrl: true })) {
      selection.toggle(index)
    } else if (checkMouseShortcut(e, { shift: true })) {
      selection.selectTo(index)
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
  function onContextMenu(e: MouseEvent, index: number) {
    rowMouseDown(e, index, true)
    const ids = []
    const indexes = []
    for (let i = 0; i < $selection.list.length; i++) {
      if ($selection.list[i]) {
        ids.push(page.getTrackId(i))
        indexes.push(i)
      }
    }
    showTrackMenu(ids, indexes)
  }
  async function rowKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      let firstIndex = selection.findFirst($selection.list) || 0
      playRow(firstIndex)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const lastAdded = $selection.lastAdded
      if (lastAdded !== null && lastAdded > 0) {
        selection.clear()
        selection.add(lastAdded - 1)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const lastAdded = $selection.lastAdded
      if (lastAdded !== null && lastAdded + 1 < $page.length) {
        selection.clear()
        selection.add(lastAdded + 1)
      }
    } else if (e.key === 'Backspace' && $selection.count > 0 && !$filter) {
      e.preventDefault()
      const s = $selection.count > 1 ? 's' : ''
      const result = await showMessageBox({
        type: 'info',
        message: `Remove the selected song${s} from the list?`,
        buttons: ['Remove Song' + s, 'Cancel'],
        defaultId: 0,
      })
      const indexes = []
      for (let i = 0; i < $selection.list.length; i++) {
        if ($selection.list[i]) {
          indexes.push(i)
        }
      }
      if (result.buttonClicked === 0) {
        removeFromOpenPlaylist(indexes)
      }
    }
  }

  function playRow(index: number) {
    newPlaybackInstance(page.getTrackIds(), index)
  }

  let dragEl: HTMLElement
  let dragElDiv: HTMLElement
  let dragLine: HTMLElement
  let dragging = false
  let indexes: number[] = []
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
        dragElDiv.innerText = track.artist + ' - ' + track.name
      } else {
        dragElDiv.innerText = indexes.length + ' items'
      }
      e.dataTransfer.setDragImage(dragEl, 0, 0)
      e.dataTransfer.setData('ferrumtracks', '')
    }
  }
  onMount(() => {
    function dragOverHandler(e: DragEvent) {
      if (dragging) {
        e.preventDefault()
      }
    }
    document.addEventListener('dragover', dragOverHandler)
    return () => document.removeEventListener('dragover', dragOverHandler)
  })
  let dragToIndex: null | number = null
  function onDragOver(e: DragEvent, index: number) {
    if (!$page.sort_desc || $page.sort_key !== 'index' || $filter) {
      dragToIndex = null
      return
    }
    if (
      dragging &&
      e.currentTarget &&
      e.dataTransfer &&
      e.dataTransfer.types[0] === 'ferrumtracks'
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
      return {}
    }
  }

  let vlist: VList

  let itemCount = 0
  page.subscribe((page) => {
    itemCount = page.length
    if (vlist) vlist.refresh()
    selection.clear()
  })
</script>

<div class="drag-ghost" bind:this={dragEl}>
  <div bind:this={dragElDiv} />
</div>

<div class="tracklist" on:dragleave={() => (dragToIndex = null)}>
  <div class="row header" class:desc={$page.sort_desc}>
    <div class="c index" class:sort={sortKey === 'index'} on:click={() => sortBy('index')}>
      <span>#</span>
    </div>
    <div class="c name" class:sort={sortKey === 'name'} on:click={() => sortBy('name')}>
      <span>Name</span>
    </div>
    <div
      class="c playCount"
      class:sort={sortKey === 'playCount'}
      on:click={() => sortBy('playCount')}>
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
      on:click={() => sortBy('albumName')}>
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
      on:click={() => sortBy('dateAdded')}>
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
    on:keydown={rowKeydown}
    let:item={track}
    let:index>
    <div
      class="row"
      on:dblclick={() => playRow(index)}
      on:mousedown={(e) => rowMouseDown(e, index)}
      on:click={(e) => rowClick(e, index)}
      on:contextmenu={(e) => onContextMenu(e, index)}
      draggable="true"
      on:dragstart={onDragStart}
      on:dragover={(e) => onDragOver(e, index)}
      on:dragend={dragEndHandler}
      class:odd={index % 2 === 0}
      class:selected={$selection.list[index] === true}>
      <div class="c index">
        {#if track.id === $playingId}
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
            <path d="M0 0h24v24H0z" fill="none" />
            <path
              d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        {:else}
          {index + 1}
        {/if}
      </div>
      <div class="c name">{track.name || ''}</div>
      <div class="c playCount">{track.playCount || ''}</div>
      <div class="c duration">{getDuration(track.duration || '')}</div>
      <div class="c artist">{track.artist || ''}</div>
      <div class="c albumName">{track.albumName || ''}</div>
      <div class="c comments">{track.comments || ''}</div>
      <div class="c genre">{track.genre || ''}</div>
      <div class="c dateAdded">{formatDate(track.dateAdded)}</div>
      <div class="c year">{track.year || ''}</div>
    </div>
  </VList>
  <div class="drag-line" class:show={dragToIndex !== null} bind:this={dragLine} />
</div>

<style lang="sass">
  :global(.selected)
    --sidebar-gradient: linear-gradient(90deg, #3f4c6b, #606c88)
    --tracklist-gradient: linear-gradient(90deg, #2d44b9b3, #2847e2b3, #2d44b9b3)
  :global(:focus .selected)
    --tracklist-gradient: linear-gradient(90deg, #2d44b9, #2847e2, #2d44b9)
    // --gradient: linear-gradient(-90deg, #606c88, #3f4c6b)
    // --gradient: linear-gradient(-90deg, #ea7bb8, #BB377D)
    // --gradient: linear-gradient(90deg, #2847e2, #872edc)
    // --gradient: linear-gradient(90deg, #4C48F6, #4F7CF7)
    // --gradient: linear-gradient(90deg, #2d44b9, #2847e2, #2d44b9)
    // --gradient: linear-gradient(90deg, #EE6957, #F2C251)
    // --gradient: linear-gradient(90deg, #1599a8, #00c295)
  .tracklist
    display: flex
    margin-top: var(--titlebar-height)
    flex-direction: column
    min-width: 0px
    width: 100%
    background-color: hsl(240, 20%, 7%)
    overflow: hidden
    .header
      .c
        overflow: visible
        *
          pointer-events: none
      .c.sort span
        font-weight: bold
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
      &.odd
        background-color: var(--tracklist-2n-bg-color)
      &.selected
        background: var(--tracklist-gradient)
      .c
        display: inline-block
        vertical-align: top
        width: 100%
        white-space: nowrap
        overflow: hidden
        text-overflow: ellipsis
        padding-right: 10px
      &.selected .index svg
        fill: var(--icon-color)
      .index
        width: 0px
        min-width: 36px
        text-align: right
        svg
          fill: #2efac7
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
        min-width: 35px
  .drag-ghost
    font-size: 14px
    top: -1000px
    position: absolute
    background-color: transparent
    padding-left: 3px
    div
      background-color: var(--drag-bg-color)
      padding: 4px 8px
      max-width: 300px
      border-radius: 3px
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
