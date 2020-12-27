<script>
  import VirtualList from '@sveltejs/svelte-virtual-list'
  export let tracks
  let tracksx = []
  $: {
    console.log(tracks)
    let i = 0
    for (const key in tracks) {
      if (!Object.prototype.hasOwnProperty.call(tracks, key)) continue
      tracksx[i] = tracks[key]
      tracksx[i].duration = Math.round(tracks[key].duration)
      i++
    }
  }
</script>

<style lang='sass'>
  .tracklist
    min-height: 0px
    height: 100%
    position: relative
    display: flex
    flex-direction: column
    margin-left: 10px
    .body
      height: 100%
      min-height: 0px
      position: relative
    .row
      display: flex
      height: 21px
      font-size: 14px
      .c
        display: inline-block
        vertical-align: top
        width: 100%
        white-space: nowrap
        overflow: hidden
        text-overflow: ellipsis
        margin-right: 10px
      .index
        width: 0px
        min-width: 20px
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
      VirtualList(height='100%' items='{tracksx}' let:item='')
        .row
          div.c.index 1
          div.c.name {item.name}
          div.c.plays {item.plays}
          div.c.time {item.duration}
          div.c.artist {item.artist}
          div.c.album {item.album}
          div.c.comments {item.comments}
          div.c.genre {item.genre}
          div.c.date-added {item.dateAdded}
          div.c.year {item.year}
</template>
