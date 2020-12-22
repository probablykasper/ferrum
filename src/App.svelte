<script>
  import { onMount } from 'svelte'
  import styles from './variables.js'

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

  :global(body)
    color: var(--text-color)
    position: relative
    width: 100%
    height: 100%
    margin: 0
    box-sizing: border-box
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif
  
  .titlebar
    height: 20px
    background-color: var(--bg-color)
    -webkit-app-region: drag
</style>

<template lang='pug'>
  svelte:head
    title Svelte app
  main(style='{cssVarStyles}')
    .titlebar
    h1 Hello World
</template>
