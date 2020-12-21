<script>
  import { onMount } from 'svelte'

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
    color: #333

  :global(body)
    position: relative
    width: 100%
    height: 100%
    margin: 0
    box-sizing: border-box
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif
  
  .titlebar
    height: 20px
    background-color: red
    -webkit-app-region: drag
</style>

<template lang='pug'>
  svelte:head
    title Svelte app
  .titlebar
</template>
