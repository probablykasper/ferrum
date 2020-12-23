<script>
  import { onMount } from 'svelte'
  import styles from './variables.js'
  import TrackList from './components/TrackList.svelte'
  // const addon = window.addon
  // console.log(addon.get_path())
  const db = window.api.db
  const headerHeight = 70
  db.load()

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
</style>

<template lang='pug'>
  svelte:head
    title Svelte app
  main(style='{cssVarStyles}')
    .header
      .titlebar
      h1 Hello World
    TrackList(tracks='{db.library.tracks}')
</template>
