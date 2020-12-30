<script>
  import VirtualList from '@sveltejs/svelte-virtual-list'
  import { playTrack } from '../stores/player.js'
  export let library
  $: tracks = library.tracks
  let ids = []
  let list = []
  $: {
    console.log(library)
    let i = 0
    for (const key in tracks) {
      if (!Object.prototype.hasOwnProperty.call(tracks, key)) continue
      ids[i] = key
      list[i] = { id: key, index: i }
      list[i].duration = Math.round(list[i].duration)
      i++
    }
  }
  let selected = new Set()
  function rowClick(id) {
    selected = new Set([id])
  }
  function playRow(index) {
    playTrack(ids, index)
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
        min-width: 40px
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
      button.c.index.play
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
      VirtualList(height='100%' items='{list}' let:item)
        .row(on:mousedown='{rowClick(item.id)}' class:selected='{selected.has(item.id)}')
          div.c.index {item.index + 1}
          button.c.index.play(on:click|stopPropagation='{playRow(item.index)}')
            svg(height='32', role='img', width='32', viewbox='0 0 24 24')
              polygon(points='21.57 12 5.98 3 5.98 21 21.57 12', fill='currentColor')
          div.c.name {tracks[item.id].name || ''}
          div.c.plays {tracks[item.id].playCount || 0}
          div.c.time {item.duration || 0}
          div.c.artist {tracks[item.id].artist || ''}
          div.c.album {tracks[item.id].album || ''}
          div.c.comments {tracks[item.id].comments || ''}
          div.c.genre {tracks[item.id].genre || ''}
          div.c.date-added {tracks[item.id].dateAdded}
          div.c.year {tracks[item.id].year || ''}
</template>
