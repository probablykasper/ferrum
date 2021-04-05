<script>
  import { onDestroy } from 'svelte'
  import NewTrackList from './components/TrackList.svelte'
  import Player from './components/Player.svelte'
  import Titlebar from './components/Titlebar.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { iTunesImport } from './stores/window'
  import { isDev, paths, importTracks } from './stores/data'
  import vars from './variables.mjs'

  let pageStatus = ''
  let pageStatusWarnings = ''
  let pageStatusErr = ''
  const { ipcRenderer } = window.require('electron')
  async function itunesImport() {
    const result = await iTunesImport(
      paths,
      (status) => {
        pageStatus = status
      },
      (warning) => {
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

  $: cssVarStyles = Object.entries(vars.cssVars)
    .map(([key, value]) => `${key}:${value}`)
    .join(';')

  let droppable = false
  function getFiles(files) {
    const allowedMimes = ['audio/mpeg']
    let validFiles = []
    for (const file of files) {
      if (allowedMimes.includes(file.type)) validFiles.push(file)
      else return
    }
    if (validFiles.length > 0) return validFiles
  }
  function dragEnter(e) {
    e.preventDefault()
    const files = getFiles(e.dataTransfer.items)
    droppable = !!files
  }
  function dragOver(e) {
    e.preventDefault()
    const files = getFiles(e.dataTransfer.items)
    droppable = !!files
  }
  function dragLeave(e) {
    e.preventDefault()
    droppable = false
  }
  function drop(e) {
    e.preventDefault()
    droppable = false
    const files = getFiles(e.dataTransfer.files)
    const paths = []
    for (const file of files) {
      paths.push(file.path)
    }
    importTracks(paths)
  }
</script>

<style lang="sass">
  :global(html), :global(body)
    background-color: var(--window-bg-color)
    height: 100%
  :global(body)
    position: relative
    width: 100%
    margin: 0
    box-sizing: border-box
  .drag-overlay
    opacity: 1
    position: absolute
    width: 100%
    height: 100%
    top: 0px
    left: 0px
    background-color: rgba(#10161e, 0.9)
    transition: all 100ms ease-in-out
    display: flex
    align-items: center
    justify-content: center
    // backdrop-filter: blur(20px)
    &:not(.show)
      pointer-events: none
      opacity: 0
  :global(h1), :global(h2), :global(h3)
    font-weight: 400

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

<template lang="pug">
  svelte:head
    title Ferrum
  main(style='{cssVarStyles}' on:dragenter|capture='{dragEnter}')
    .meat
      Sidebar
      NewTrackList
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
    .drag-overlay(class:show='{droppable}' on:dragleave='{dragLeave}' on:drop='{drop}' on:dragover='{dragOver}')
      h1 Drop files to import
    Titlebar(dev='{isDev}')
</template>
