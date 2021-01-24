<script>
  import { stopped, paused, playPause } from '../stores/player.ts'
</script>

<style lang='sass'>
  .container
    display: flex
  .stopped
    // button, input
    button
      pointer-events: none
      opacity: 0.5
</style>

<template lang='pug'>
  .container(class:stopped='{$stopped}')
    div
      +if('$paused')
        button(on:click='{playPause}') Play
        +else
          button(on:click='{playPause}') Pause
      div {$stopped ? 'stopped' : ''}
</template>
