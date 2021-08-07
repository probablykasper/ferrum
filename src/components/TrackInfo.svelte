<script lang="ts">
  import { writable } from 'svelte/store'
  import type { Writable } from 'svelte/store'
  import Modal from './Modal.svelte'
  import { visible, track, open, coverSrc, id } from '../stores/trackInfo'
  import { checkShortcut, focus, focusLast } from '../scripts/helpers'
  import type { TrackID } from '../stores/libraryTypes'
  import { methods } from '../stores/data'
  import Button from './Button.svelte'

  function uintFilter(value: string) {
    return value.replace(/[^0-9]*/g, '')
  }
  function toString(value: any) {
    return String(value).replaceAll(/\0/g, '')
  }
  let name = ''
  let artist = ''
  let albumName = ''
  let albumArtist = ''
  let composer = ''
  let grouping = ''
  let genre = ''
  let year = ''
  $: year = uintFilter(year)
  let trackNum = ''
  let trackCount = ''
  let discNum = ''
  let discCount = ''
  let bpm = ''
  let compilation = false
  let rating = 0
  let liked = false
  let playCount = 0
  let comments = ''
  track.subscribe((track) => {
    if (track) {
      name = track.name
      artist = track.artist
      albumName = track.albumName || ''
      albumArtist = track.albumArtist || ''
      composer = track.composer || ''
      grouping = track.grouping || ''
      genre = track.genre || ''
      year = toString(track.year || '')
      trackNum = toString(track.trackNum || '')
      trackCount = toString(track.trackCount || '')
      discNum = toString(track.discNum || '')
      discCount = toString(track.discCount || '')
      bpm = toString(track.bpm || '')
      compilation = track.compilation || false
      rating = track.rating || 0
      liked = track.liked || false
      playCount = track.playCount || 0
      comments = toString(track.comments || '')
    }
  })
  function save() {
    if ($id) {
      methods.updateTrackInfo($id, {
        name,
        artist,
        albumName,
        albumArtist,
        composer,
        grouping,
        genre,
        year,
        // trackNum,
        // trackCount,
        // discNum,
        // discCount,
        // bpm,
        // compilation,
        // rating,
        // liked,
        // playCount,
        comments,
      })
      visible.set(false)
      focusLast()
    }
  }
  function big(v: string) {
    return v.length >= 3
  }
  function cancel() {
    visible.set(false)
    focusLast()
  }
  function keydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'escape')) {
      if (document.activeElement instanceof HTMLElement) {
        cancel()
      }
    }
  }
</script>

<template lang="pug">
  svelte:window(on:keydown='{keydown}')
  Modal(bind:visible='{$visible}' close='{cancel}')
    form.modal(on:submit|preventDefault='{save}')
      .header
        +if('$coverSrc')
          img.cover(alt="" src='{$coverSrc}')
          +else
            svg.cover(xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24')
              path(d='M23 0l-15.996 3.585v13.04c-2.979-.589-6.004 1.671-6.004 4.154 0 2.137 1.671 3.221 3.485 3.221 2.155 0 4.512-1.528 4.515-4.638v-10.9l12-2.459v8.624c-2.975-.587-6 1.664-6 4.141 0 2.143 1.715 3.232 3.521 3.232 2.14 0 4.476-1.526 4.479-4.636v-17.364z')
        div
          .name {name}
          .artist {artist}
      .spacer
      .row
        .label Title
        input(type='text' bind:value='{name}' use:focus)
      .row
        .label Artist
        input(type='text' bind:value='{artist}')
      .row
        .label Album
        input(type='text' bind:value='{albumName}')
      .row
        .label Album artist
        input(type='text' bind:value='{albumArtist}')
      .row
        .label Composer
        input(type='text' bind:value='{composer}')
      .row
        .label Grouping
        input(type='text' bind:value='{grouping}')
      .row
        .label Genre
        input(type='text' bind:value='{genre}')
      .row
        .label Year
        input.medium(type='text' bind:value='{year}')
      .row.num
        .label Track
        input.num(disabled type='text' bind:value='{trackNum}' class:big='{big(trackNum)}')
        .midtext of
        input.num(disabled type='text' bind:value='{trackCount}' class:big='{big(trackCount)}')
      .row.num
        .label Disc number
        input.num(disabled type='text' bind:value='{discNum}' class:big='{big(discNum)}')
        .midtext of
        input.num(disabled type='text' bind:value='{discCount}' class:big='{big(discCount)}')
      .row
        .label Compilation
        p {compilation ? 'Yes' : 'No'}
      .row
        .label Rating
        p {rating}, {liked ? 'Liked' : 'Not Liked'}
      .row
        .label BPM
        input.medium(disabled type='text' bind:value='{bpm}')
      .row
        .label Play count
        p {playCount}
      .row
        .label Comments
        input(type='text' bind:value='{comments}')
      .spacer
      .bottom
        Button(secondary on:click='{cancel}') Cancel
        Button(submit) Save
</template>

<style lang="sass">
  $cover-size: 90px
  .modal
    width: 450px
  .header
    display: flex
    align-items: center
    height: $cover-size
  .spacer
    height: 15px
  .name
    font-size: 18px
    font-weight: 500
  .artist
    font-size: 13px
    opacity: 0.7
  .cover
    width: $cover-size
    margin-right: 20px
    flex-shrink: 0
  svg.cover
    padding: 26px
    width: $cover-size
    height: $cover-size
    box-sizing: border-box
    background: var(--empty-cover-bg-color)
    fill: var(--empty-cover-color)
    border-radius: 2px
  .row
    padding: 2px 0px
    display: flex
    align-items: center
  input
    flex-grow: 1
    font-size: 13px
    padding: 3px 4px
    background-color: transparent
    color: inherit
    border: 1px solid rgba(#ffffff, 0.25)
    box-sizing: border-box
    &[disabled]
      opacity: 0.4
    &.num
      width: 30px
      flex-grow: 0
    &.big
      width: 50px
      flex-grow: 0
    &.medium
      width: 80px
      flex-grow: 0
    &:focus
      outline: 2px solid var(--accent-1)
      outline-offset: -1px
  p
    padding: 3px 0px
    font-size: 13px
    margin: 0px
  .label
    display: inline-block
    text-align: right
    width: 80px
    margin-right: 8px
    font-size: 12px
    opacity: 0.7
  .midtext
    display: inline-block
    width: 20px
    text-align: center
  .bottom
    display: flex
    justify-content: flex-end
</style>
