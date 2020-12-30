<script>
  import VirtualList from '@sveltejs/svelte-virtual-list'
  import { playTrack } from '../stores/player.js'
  export let library
  $: libTracks = library.tracks
  let tracks = []
  $: {
    console.log(library)
    let i = 0
    for (const key in libTracks) {
      if (!Object.prototype.hasOwnProperty.call(libTracks, key)) continue
      tracks[i] = libTracks[key]
      tracks[i].id = key
      tracks[i].duration = Math.round(libTracks[key].duration)
      i++
    }
  }
  let selected = new Set()
  function rowClick(item) {
    selected = new Set([item.id])
  }
</script>

<style lang='sass'>
  .tracklist
    min-height: 0px
    height: 100%
    position: relative
    display: flex
    flex-direction: column
    .body
      height: 100%
      min-height: 0px
      position: relative
    .row
      display: flex
      $row-height: 24px
      height: $row-height
      font-size: 14px
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
        margin-right: 10px
      .c.index, .c.play
        margin-left: 10px
      .index, .play
        width: 0px
        min-width: 20px
        text-align: center
      .play
        display: none
        padding: 0px
        border: none
        background-color: transparent
        outline: none
        justify-content: center
        align-items: center
        svg
          width: 16px
          height: 16px
          color: var(--icon-color)
      &:hover .index
        display: none
      &:hover .play
        display: flex
      .year
        width: 0px
        min-width: 35px
      .time
        width: 0px
        min-width: 40px

  .row:nth-child(even)
    background-color: var(--bg-color-2)
</style>

<template lang='pug'>
  .tracklist
    .row.header
      div.c.index
      div.c.name Name
      div.c.plays Plays
      div.c.time Time
      div.c.artist Artist
      div.c.album Album
      div.c.comments Comments
      div.c.genre Genre
      div.c.date-added Date Added
      div.c.year Year
    .body
      VirtualList(height='100%' items='{tracks}' let:item='')
        .row(on:mousedown='{rowClick(item)}' class:selected='{selected.has(item.id)}')
          div.c.index 1
          button.c.index.play(on:click|stopPropagation='{playTrack(item.id)}')
            svg(height='32', role='img', width='32', viewbox='0 0 24 24')
              polygon(points='21.57 12 5.98 3 5.98 21 21.57 12', fill='currentColor')
          div.c.name {item.name || ''}
          div.c.plays {item.playCount || 0}
          div.c.time {item.duration || 0}
          div.c.artist {item.artist || ''}
          div.c.album {item.album || ''}
          div.c.comments {item.comments || ''}
          div.c.genre {item.genre || ''}
          div.c.date-added {item.dateAdded}
          div.c.year {item.year || ''}
</template>
