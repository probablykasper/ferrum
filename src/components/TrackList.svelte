<script>
  import { onMount } from 'svelte'
  import VirtualList from '@sveltejs/svelte-virtual-list'
  import { tracks, trackLists } from '../stores/library.js'
  import { playTrack } from '../stores/player.js'
  import { openPlaylist } from '../stores/view.js'
  // export let library
  $: trackList = $trackLists[$openPlaylist]
  let trackIds = []
  let list = []
  $: {
    // let listIds = trackList.children
    let newTrackIds = []
    let newList = []
    if (trackList.type === 'playlist') {
      newTrackIds = trackList.tracks
    } else if (trackList.type === 'special') {
      for (const key in $tracks) {
        if (!Object.hasOwnProperty.call($tracks, key)) continue
        newTrackIds.push(key)
      }
    }
    for (let i = 0; i < newTrackIds.length; i++) {
      newList.push({ id: newTrackIds[i], index: i })
    }
    trackIds = newTrackIds
    list = newList
  }
  function getDuration(dur) {
    dur = Math.round(dur)
    const secs = dur % 60
    const mins = (dur - secs)/60
    return mins+':'+secs
  }
  let selected = new Set()
  function rowClick(id) {
    selected = new Set([id])
  }
  function playRow(index) {
    playTrack(trackIds, index)
  }
  let scrollContainer
  onMount(() => {
    const viewport = scrollContainer.getElementsByTagName('svelte-virtual-list-viewport')[0]
    scrollContainer.addEventListener('keydown', function(e) {
      let prevent = true
      if (e.key == 'Home') viewport.scrollTop = 0
      else if (e.key == 'End') viewport.scrollTop = viewport.scrollHeight
      else if (e.key == 'PageUp') viewport.scrollTop -= viewport.clientHeight
      else if (e.key == 'PageDown') viewport.scrollTop += viewport.clientHeight
      else prevent = false
      if (prevent) e.preventDefault()
    })
  })
</script>

<style lang='sass'>
  .tracklist
    min-height: 0px
    height: 100%
    width: 100%
    position: relative
    display: flex
    flex-direction: column
    outline: none
    .body
      height: 100%
      min-height: 0px
      position: relative
    .row
      display: flex
      $row-height: 24px
      height: $row-height
      font-size: 13px
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
      .name
        width: 170%
      .plays
        width: 0px
        min-width: 40px
        text-align: right
      .time
        width: 0px
        min-width: 40px
        text-align: right
      .artist
        width: 120%
      .album
        width: 90%
      .genre
        width: 65%
      .comments
        width: 65%
      .date-added
        width: 130px
        min-width: 130px
      .year
        width: 0px
        min-width: 35px

  .row:nth-child(even)
    background-color: var(--bg-color-2)
</style>

<template lang='pug'>
  .tracklist(tabindex='0' bind:this='{scrollContainer}')
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
        .row(on:dblclick='{playRow(item.index)}' on:mousedown='{rowClick(item.id)}' class:selected='{selected.has(item.id)}')
          div.c.index {item.index + 1}
          button.c.index.play(on:click|stopPropagation='{playRow(item.index)}')
            svg(height='32', role='img', width='32', viewbox='0 0 24 24')
              polygon(points='21.57 12 5.98 3 5.98 21 21.57 12', fill='currentColor')
          div.c.name {$tracks[item.id].name || ''}
          div.c.plays {$tracks[item.id].playCount || 0}
          div.c.time {getDuration($tracks[item.id].duration) || 0}
          div.c.artist {$tracks[item.id].artist || ''}
          div.c.album {$tracks[item.id].album || ''}
          div.c.comments {$tracks[item.id].comments || ''}
          div.c.genre {$tracks[item.id].genre || ''}
          div.c.date-added {$tracks[item.id].dateAdded}
          div.c.year {$tracks[item.id].year || ''}
</template>
