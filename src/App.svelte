<script>
  import { onMount } from 'svelte'
  import styles from './variables.js'
  import TrackList from './components/TrackList.svelte'
  // const addon = window.addon
  // console.log(addon.get_path())
  const db = window.api.db
  db.load()

  let pageStatus = ''
  let pageStatusWarnings = ''
  let pageStatusErr = ''
  const { ipcRenderer } = window.require('electron')
  ipcRenderer.on('itunesImport', async(event, arg) => {
    const { err, warnings } = await db.iTunesImport((status) => {
      pageStatus = status
    }, (warning) => {
      pageStatusWarnings += warning+'\n'
    })
    if (err) pageStatusErr = err.stack
  })

  $: cssVarStyles = Object.entries(styles)
    .map(([key, value]) => `${key}:${value}`)
    .join(';')
  const root = document.documentElement
  $: root.style.setProperty('--bg-color', styles['--bg-color'])

  let counter = 0 // @hmr:keep

  onMount(() => {
    const interval = setInterval(() => {
      counter++
    }, 1000)
    return () => {
      clearInterval(interval)
    }
  })
</script>

<style lang='sass'>
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
  
  .header
    .titlebar
      height: 20px
      background-color: var(--bg-color)
      -webkit-app-region: drag

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
      max-height: 350px
      padding: 10px 20px
      display: flex
      flex-direction: column
      align-items: center
      justify-content: center
      .page-status-item
        margin: 6px 0px
      pre
        white-space: pre-wrap
        overflow: hidden
        overflow-wrap: anywhere
        user-select: text
</style>

<template lang='pug'>
  svelte:head
    title Ferrum
  main(style='{cssVarStyles}')
    .header
      .titlebar
      h1 Hello World
    TrackList(tracks='{db.library.tracks}')
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
