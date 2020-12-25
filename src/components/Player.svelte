<script>
  import Gapless from 'gapless.js'
  let sliderBeingDragged = false
  let currentTime = 0
  let duration = 0
  let sliderValue = 0
  const sliderSteps = 400
  const player = new Gapless.Queue({
    numberOfTracksToPreload: 2,
    onProgress: (track) => {
      if (track) {
        currentTime = track.currentTime
        duration = track.duration
        if (!sliderBeingDragged && duration > 0) {
          sliderValue = currentTime/duration*sliderSteps
        }
      }
    },
  })
  const tracks = [
    '/Users/kasper/Downloads/01 Neo-Seoul (Part 1).m4a',
    '/Users/kasper/Downloads/02 Neo-Tokyo (Part 2).m4a',
    '/Users/kasper/Downloads/03 Aeon Metropolis (Part 3).m4a',
    '/Users/kasper/Downloads/04 Goodnight Sequence (part 4).m4a',
  ]
  for (const track of tracks) {
    player.addTrack({ trackUrl: 'file://'+track })
  }
  function playPause() {
    player.togglePlayPause()
  }
  function previous() {
    player.playNext()
  }
  function next() {
    player.playNext()
  }
  function sliderMousedown() {
    sliderBeingDragged = true
  }
  function sliderMouseup(e) {
    sliderBeingDragged = false
    player.currentTrack.seek(e.target.value/sliderSteps*duration || 0)
  }
</script>

<style lang='sass'>
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
  button(on:click='{previous}') &lt;
  button(on:click='{playPause}') Play/Pause
  button(on:click='{next}') &gt;
  div duration {duration} - currentTime {currentTime}
  input.slider(tabindex=-1 type='range' min=0 max='{sliderSteps}' bind:value='{sliderValue}' on:mousedown='{sliderMousedown}' on:mouseup='{sliderMouseup}')
</template>
