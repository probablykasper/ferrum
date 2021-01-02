<script>
  import { tracks } from '../stores/library.js'
  import { stopped, playPause, previous, skip, duration, currentTime, seek, currentTrackId } from '../stores/player.js'
  let sliderBeingDragged = false
  const sliderSteps = 400
  let sliderValue = 0
  $: {
    if (!sliderBeingDragged && $duration > 0) {
      sliderValue = $currentTime/$duration*sliderSteps
    }
  }
  function sliderMousedown() {
    sliderBeingDragged = true
  }
  function sliderMouseup(e) {
    sliderBeingDragged = false
    seek(e.target.value/sliderSteps*$duration || 0)
  }
</script>

<style lang='sass'>
  .container
    display: flex
  .stopped
    button, input
      pointer-events: none
      opacity: 0.5
  input.slider
    width: 400px
    -webkit-appearance: none
    background: transparent
    padding: 4px 10px
    &:focus
      outline: none
    &::-webkit-slider-thumb
      -webkit-appearance: none
      margin-top: 2px
      transform: translate(0px, -50%)
      height: 10px
      width: 10px
      border-radius: 100px
      background: #ffffff
      box-shadow: 0px 0px 5px 1px rgba(0,0,0,0.5)
    &::-webkit-slider-runnable-track
      width: 100%
      height: 4px
      background: #5e5e5e
      border-radius: 100px
      position: relative
</style>

<template lang='pug'>
  .container(class:stopped='{$stopped}')
    div
      button(on:click='{previous}') &lt;
      button(on:click='{playPause}') Play/Pause
      button(on:click='{skip}') &gt;
      div {$stopped ? 'stopped' : ''} duration {$duration} - currentTime {$currentTime}
      input.slider(tabindex=-1 type='range' min=0 max='{sliderSteps}' bind:value='{sliderValue}' on:mousedown='{sliderMousedown}' on:mouseup='{sliderMouseup}')
    div
      div {$tracks[$currentTrackId].name}
      div {$tracks[$currentTrackId].artist}
</template>
