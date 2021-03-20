<script lang="ts">
  import VList from './VirtualList.svelte'
  import { openPlaylist } from '../stores/data'
  import { newPlaybackInstance, playingId } from '../stores/player'
  import { getDuration } from '../scripts/formatting'
  import { showTrackMenu } from '../stores/contextMenu'

  const sortBy = openPlaylist.sortBy
  $: sortKey = $openPlaylist.sort_key

  let visibleItems: any[] = []
  let startIndex: number = 0
  let endIndex: number = 0

  let selected: number | null
  function rowClick(index: number) {
    selected = index
  }
  function rowKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && selected !== null) {
      playRow(selected)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (selected !== null && selected > 0) selected -= 1
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (selected !== null && selected < $openPlaylist.length - 1) selected += 1
    }
  }

  function playRow(index: number) {
    newPlaybackInstance(openPlaylist.getTrackIds(), index)
  }

  function getItem(index: number) {
    try {
      const track = openPlaylist.getTrack(index)
      return track
    } catch (err) {
      return {}
    }
  }

  openPlaylist.subscribe((openPlaylist) => {
    const newItems = []
    const visibleCount = endIndex - startIndex
    for (let i = 0; i < visibleCount; i++) {
      if (startIndex + i >= openPlaylist.length) break
      const item = getItem(startIndex + i)
      newItems.push(item)
    }
    visibleItems = newItems
  })
</script>

<style lang="sass">
  .tracklist
    display: flex
    flex-direction: column
    min-width: 0px
    width: 100%
    .row.header
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
      &.selected
        background-color: var(--select-color)
      .c
        display: inline-block
        vertical-align: top
        width: 100%
        white-space: nowrap
        overflow: hidden
        text-overflow: ellipsis
        padding-right: 10px
      .index
        width: 0px
        min-width: 36px
        text-align: right
        svg
          fill: var(--icon-color)
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
</style>

<div class="tracklist">
  <div class="row header" class:desc={$openPlaylist.sort_desc}>
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
    bind:visibleItems
    itemHeight={24}
    itemCount={$openPlaylist.length}
    bind:startIndex
    bind:endIndex
    on:keydown={rowKeydown}
    let:item={track}
    let:index>
    <div
      class="row"
      on:dblclick={() => playRow(index)}
      on:mousedown={() => rowClick(index)}
      on:contextmenu={() => showTrackMenu(openPlaylist.getTrackId(index))}
      class:selected={selected === index}>
      <div class="c index">
        {#if openPlaylist.getTrackId(index) === $playingId}
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
      <div class="c dateAdded">{track.dateAdded || ''}</div>
      <div class="c year">{track.year || ''}</div>
    </div>
  </VList>
</div>
