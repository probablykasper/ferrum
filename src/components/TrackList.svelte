<script>
  import { onMount, onDestroy } from 'svelte'
  // import VirtualList from '@lionixevolve/svelte-virtual-list-enhanced'
  import VirtualList from './VirtualList.svelte'
  import { tracks } from '../stores/library.js'
  import { playTrack } from '../stores/player.js'
  import { trackIds, sort as sorting } from '../stores/view.js'
  let toTop
  const unsubscribe = trackIds.subscribe(() => {
    // Fix empty list when opening playlist while scrolled down
    if (toTop) toTop()
  })
  onDestroy(unsubscribe)
  function getDuration(dur) {
    dur = Math.round(dur)
    let secs = dur % 60
    if (secs < 10) secs = '0'+secs
    const mins = (dur - secs)/60
    return mins+':'+secs
  }
  let selected = new Set()
  function rowClick(id) {
    selected = new Set([id])
  }
  function playRow(index) {
    playTrack($trackIds, index)
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
  function sort(e) {
    sorting.setKey(e.target.dataset.key, true)
  }
</script>

<style lang='sass'>
  .tracklist
    min-height: 0px
    height: 100%
    width: 100%
    overflow-x: auto
    position: relative
    display: flex
    flex-direction: column
    outline: none
    .body
      height: 100%
      min-height: 0px
      position: relative
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
        padding-right: 10px
      .c.index, .c.play
        padding-left: 10px
      &.header .c.index
        display: initial
      .index, .play
        width: 0px
        min-width: 40px
        text-align: center
      .play
        display: none
        box-sizing: content-box
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

  .row:nth-child(even)
    background-color: var(--bg-color-2)
</style>

<template lang='pug'>
  .tracklist(tabindex='0' bind:this='{scrollContainer}')
    .row.header(class:desc="{$sorting.desc}")
      .c.index(class:sort="{$sorting.key === 'index'}" data-key='index' on:click='{sort}')
        span #
      .c.name(class:sort="{$sorting.key === 'name'}" data-key='name' on:click='{sort}')
        span Name
      .c.playCount(class:sort="{$sorting.key === 'playCount'}" data-key='playCount' on:click='{sort}')
        span Plays
      .c.duration(class:sort="{$sorting.key === 'duration'}" data-key='duration' on:click='{sort}')
        span Time
      .c.artist(class:sort="{$sorting.key === 'artist'}" data-key='artist' on:click='{sort}')
        span Artist
      .c.albumName(class:sort="{$sorting.key === 'albumName'}" data-key='albumName' on:click='{sort}')
        span Album
      .c.comments(class:sort="{$sorting.key === 'comments'}" data-key='comments' on:click='{sort}')
        span Comments
      .c.genre(class:sort="{$sorting.key === 'genre'}" data-key='genre' on:click='{sort}')
        span Genre
      .c.dateAdded(class:sort="{$sorting.key === 'dateAdded'}" data-key='dateAdded' on:click='{sort}')
        span Date Added
      .c.year(class:sort="{$sorting.key === 'year'}" data-key='year' on:click='{sort}')
        span Year
    .body
      VirtualList(bind:toTop='{toTop}' height='100%' items='{$trackIds}' let:item='{id}' let:index)
        .row(on:dblclick='{playRow(index)}' on:mousedown='{rowClick(id)}' class:selected='{selected.has(id)}')
          .c.index {index + 1}
          button.c.index.play(on:click|stopPropagation='{playRow(index)}')
            svg(height='32', role='img', width='32', viewbox='0 0 24 24')
              polygon(points='21.57 12 5.98 3 5.98 21 21.57 12', fill='currentColor')
          .c.name {$tracks[id].name || ''}
          .c.playCount {$tracks[id].playCount || 0}
          .c.duration {getDuration($tracks[id].duration) || 0}
          .c.artist {$tracks[id].artist || ''}
          .c.albumName {$tracks[id].albumName || ''}
          .c.comments {$tracks[id].comments || ''}
          .c.genre {$tracks[id].genre || ''}
          .c.dateAdded {$tracks[id].dateAdded}
          .c.year {$tracks[id].year || ''}
</template>
