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
  :global(html)
    position: relative
    width: 100%
    height: 100%

  :global(body)
    position: relative
    width: 100%
    height: 100%
    color: #333
    margin: 0
    padding: 8px
    box-sizing: border-box
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif
  
  :global()
    a
      color: rgb(0,100,200)
      text-decoration: none
    a:hover
      text-decoration: underline
    a:visited
      color: rgb(0,80,160)

  main
    text-align: center
    padding: 1em
    max-width: 240px
    margin: 0 auto

  h1
    color: #ff3e00
    text-transform: uppercase
    font-size: 4em
    font-weight: 100

  @media (min-width: 640px)
    main
      max-width: none
</style>

<template lang='pug'>
  svelte:head
    title Svelte app
  main
    h1 Hello world!
    p Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.
    p This page has been open for {counter}s.
</template>
