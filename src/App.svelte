<script>
  import { onDestroy } from 'svelte'
  import styles from './variables.json'
  // import TrackList from './components/TrackListOld.svelte'
  import NewTrackList from './components/TrackList.svelte'
  import Player from './components/Player.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import { isDev } from './stores/data.ts'
  const db = window.db

  let pageStatus = ''
  let pageStatusWarnings = ''
  let pageStatusErr = ''
  const { ipcRenderer } = window.require('electron')
  async function itunesImport() {
    const result = await db.iTunesImport(
      (status) => {
        pageStatus = status
      },
      (warning) => {
        console.warn(warning)
        pageStatusWarnings += warning + '\n'
      }
    )
    if (result.cancelled) return
    if (result.err) {
      pageStatusErr = result.err.stack
    } else {
      db.overwriteLibrary({
        version: 1,
        tracks: result.tracks,
        trackLists: result.trackLists,
        playTime: [],
      })
      pageStatus = 'SAVING'
      await db.save()
      pageStatus = ''
    }
  }
  ipcRenderer.on('itunesImport', itunesImport)
  onDestroy(() => {
    ipcRenderer.off('itunesImport', itunesImport)
  })

  $: cssVarStyles = Object.entries(styles)
    .map(([key, value]) => `${key}:${value}`)
    .join(';')
  const root = document.documentElement
  $: root.style.setProperty('--bg-color', styles['--bg-color'])
</script>

<style lang="sass">
  :global(html), :global(body)
    background-color: var(--bg-color)
    height: 100%
  :global(body)
    position: relative
    width: 100%
    margin: 0
    box-sizing: border-box

  main
    height: 100%
    max-height: 100%
    color: var(--text-color)
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif
    user-select: none
    display: flex
    flex-direction: column
  
  .dev .titlebar
    background-color: #00526b
  .titlebar
      height: 22px
      background-color: var(--bg-color-2)
      -webkit-app-region: drag
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
  main(style='{cssVarStyles}' class:dev='{isDev}')
    .header
      .titlebar
      Player
      input
    .meat
      Sidebar
      NewTrackList
      //- TrackList
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
</template>
