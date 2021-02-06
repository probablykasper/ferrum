<script lang="ts">
  import VList from './VirtualList.svelte'
  import { openPlaylist } from '../stores/data'
  import { playIndex } from '../stores/player'
  import { getDuration } from '../scripts/formatting'

  const sortBy = openPlaylist.sortBy
  $: sortKey = $openPlaylist.sort_key

  let visibleItems: any[] = []
  let startIndex: number = 0
  let endIndex: number = 0

  let selected = new Set()
  function rowClick(index: number) {
    selected = new Set([index])
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
      .c.index
        padding-left: 10px
      &.header .c.index
        display: initial
      .index
        width: 0px
        min-width: 35px
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
    <div class="c index" class:sort={sortKey === 'index'} on:click={()=>sortBy('index')}>
      <span>#</span>
    </div>
    <div class="c name" class:sort={sortKey === 'name'} on:click={()=>sortBy('name')}>
      <span>Name</span>
    </div>
    <div class="c playCount" class:sort={sortKey === 'playCount'} on:click={()=>sortBy('playCount')}>
      <span>Plays</span>
    </div>
    <div class="c duration" class:sort={sortKey === 'duration'} on:click={()=>sortBy('duration')}>
      <span>Time</span>
    </div>
    <div class="c artist" class:sort={sortKey === 'artist'} on:click={()=>sortBy('artist')}>
      <span>Artist</span>
    </div>
    <div class="c albumName" class:sort={sortKey === 'albumName'} on:click={()=>sortBy('albumName')}>
      <span>Album</span>
    </div>
    <div class="c comments" class:sort={sortKey === 'comments'} on:click={()=>sortBy('comments')}>
      <span>Comments</span>
    </div>
    <div class="c genre" class:sort={sortKey === 'genre'} on:click={()=>sortBy('genre')}>
      <span>Genre</span>
    </div>
    <div class="c dateAdded" class:sort={sortKey === 'dateAdded'} on:click={()=>sortBy('dateAdded')}>
      <span>Date Added</span>
    </div>
    <div class="c year" class:sort={sortKey === 'year'} on:click={()=>sortBy('year')}>
      <span>Year</span>
    </div>
  </div>
  <VList {getItem} bind:visibleItems itemHeight={24} itemCount={$openPlaylist.length} bind:startIndex bind:endIndex let:item={track} let:index>
    <div class="row" on:dblclick={() => playIndex(index)} on:mousedown={() => rowClick(index)} class:selected={selected.has(index)}>
      <div class="c index">{index + 1}</div>
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
