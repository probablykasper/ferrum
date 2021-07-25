<script lang="ts">
  import { onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'
  import TrackList from './components/TrackList.svelte'
  import Player from './components/Player.svelte'
  import Titlebar from './components/Titlebar.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import Queue from './components/Queue.svelte'
  import { queueVisible } from './stores/queue'
  import { iTunesImport } from './stores/window'
  import { isDev, paths, importTracks } from './stores/data'
  import { playPause } from './stores/player'

  let pageStatus = ''
  let pageStatusWarnings = ''
  let pageStatusErr = ''
  const { ipcRenderer } = window.require('electron')
  async function itunesImport() {
    const result = await iTunesImport(
      paths,
      (status: any) => {
        pageStatus = status
      },
      (warning: any) => {
        console.warn(warning)
        pageStatusWarnings += warning + '\n'
      }
    )
    if (result.err) pageStatusErr = result.err.stack
    else if (result.cancelled) pageStatus = ''
    else pageStatus = 'Done. Restart Ferrum'
  }
  ipcRenderer.on('itunesImport', itunesImport)
  onDestroy(() => {
    ipcRenderer.off('itunesImport', itunesImport)
  })

  let droppable = false
  const allowedMimes = ['audio/mpeg']
  function getFilePaths(e: DragEvent): string[] {
    if (!e.dataTransfer) return []
    let validPaths = []
    for (const file of e.dataTransfer.files) {
      if (allowedMimes.includes(file.type)) {
        validPaths.push(file.path)
      }
    }
    return validPaths
  }
  function hasFiles(e: DragEvent): boolean {
    if (!e.dataTransfer) return false
    for (const item of e.dataTransfer.items) {
      if (item.kind === 'file' && allowedMimes.includes(item.type)) {
        return true
      }
    }
    return false
  }
  function dragEnter(e: DragEvent) {
    e.preventDefault()
    droppable = hasFiles(e)
  }
  function dragOver(e: DragEvent) {
    e.preventDefault()
    droppable = hasFiles(e)
  }
  function dragLeave(e: DragEvent) {
    e.preventDefault()
    droppable = false
  }
  function drop(e: DragEvent) {
    e.preventDefault()
    droppable = false
    const validPaths = getFilePaths(e)
    const paths = []
    for (const path of validPaths) {
      paths.push(path)
    }
    importTracks(paths)
  }
  function keydown(e: KeyboardEvent) {
    let el = e.target as HTMLAudioElement
    if (el && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
      if (e.key === ' ') {
        e.preventDefault()
        playPause()
      }
    }
  }
</script>

<template lang="pug">
  svelte:window(on:keydown='{keydown}' on:dragenter|capture='{dragEnter}')
  svelte:head
    title Ferrum
  main
    .meat
      Sidebar
      TrackList
      +if('$queueVisible')
        Queue
    Player
    +if('pageStatus || pageStatusWarnings || pageStatusErr')
      .page-status-bg
        .page-status
          +if('pageStatus')
            .page-status-item {pageStatus}
          +if('pageStatusWarnings')
            .page-status-item
              b Warnings:
              pre {pageStatusWarnings}
          +if('pageStatusErr')
            .page-status-item
              b Error:
              pre {pageStatusErr}
    +if('droppable')
      //- if the overlay is always visible, it's not possible to scroll while dragging tracks
      .drag-overlay(in:fade='{{ duration: 100 }}')
        h1 Drop files to import
      .dropzone(on:dragleave='{dragLeave}' on:drop='{drop}' on:dragover='{dragOver}')
    Titlebar(dev='{isDev}')
</template>

<style lang="sass">
  main
    --hue: 230
    --tracklist-2n-bg-color: #1E1F24
    --sidebar-bg-color: #000000
    --player-bg-color: hsl(230deg 9% 10%)
    --text-color: #e6e6e6
    --drag-bg-color: rgb(30, 31, 36)
    --drag-line-color: #0083f5
    --empty-cover-bg-color: hsl(230,6%,18%)
    --empty-cover-color: hsl(228,4%,28%)
    --outline-color-disabled: #505766
    --border-color: #333333
    --outline-color: #344c7f
    --icon-color: #FFFFFF
    --icon-highlight-color: #20f39f
    --titlebar-height: 22px
  :global(html), :global(body)
    background-color: #0D1115
    height: 100%
  :global(body)
    position: relative
    width: 100%
    margin: 0
    box-sizing: border-box
  :global(h1), :global(h2), :global(h3)
    font-weight: 400
  .dropzone, .drag-overlay
    position: fixed
    width: 100%
    height: 100%
    top: 0px
    left: 0px
  .drag-overlay
    display: flex
    align-items: center
    justify-content: center
    background-color: rgba(#10161e, 0.9)
    transition: all 100ms ease-in-out

  main
    height: 100%
    max-height: 100%
    color: var(--text-color)
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif
    user-select: none
    display: flex
    flex-direction: column

  .meat
    position: relative
    height: 0px
    display: flex
    flex-direction: row
    flex-grow: 1

  .page-status-bg
    position: absolute
    top: 0px
    left: 0px
    width: 100%
    height: 100%
    background-color: rgba(#1a1a1a, 0.3)
    display: flex
    justify-content: center
    align-items: center
    .page-status
      background-color: #3b3b3b
      min-width: 300px
      max-width: 800px
      min-height: 100px
      max-height: calc(100% - 100px)
      overflow-y: scroll
      padding: 10px 20px
      user-select: text
      .page-status-item
        margin: 6px 0px
      pre
        white-space: pre-wrap
        overflow: hidden
        overflow-wrap: anywhere
</style>
