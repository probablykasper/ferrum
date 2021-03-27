<script>
  import {
    stopped,
    paused,
    playPause,
    duration,
    currentTime,
    seek,
    playingTrack,
    previous,
    next,
  } from '../stores/player'
  import { getDuration } from '../scripts/formatting'
  let sliderBeingDragged = false
  const sliderSteps = 400
  let sliderValue = 0
  $: {
    if (!sliderBeingDragged && $duration > 0) {
      sliderValue = ($currentTime / $duration) * sliderSteps
    }
  }
  function sliderMousedown() {
    sliderBeingDragged = true
  }
  function sliderMouseup(e) {
    sliderBeingDragged = false
    seek((e.target.value / sliderSteps) * $duration || 0)
  }
</script>

<style lang="sass">
  .container
    display: flex
    height: 70px
    align-items: center
    background-color: var(--bg-color-3)
  .stopped
    button, input
      pointer-events: none
      opacity: 0.5
  .left
    width: 30%
    .name
      margin-left: 20px
      font-size: 14px
    .artist
      margin-left: 20px
      font-size: 12px
      opacity: 0.8
  .middle
    width: 40%
  .right
    width: 30%
  button
    background-color: transparent
    border: none
    padding: 0px
    opacity: 0.7
    &:hover
      opacity: 1
    svg
      fill: var(--icon-color)
      width: 100%
      height: 100%
      // width: 32px
      // width: 32px
  button.play, button.pause
    width: 36px
    height: 36px
    margin: 0px 15px
    // opacity: 0.8
  .controls
    display: flex
    justify-content: center
  .time-bar
    display: flex
    .current-time
      text-align: right
    small
      font-size: 13px
      opacity: 0.5
      min-width: 40px
      font-family: 'Open Sans' // for monospace digits
  input.time
    width: 100%
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

<template lang="pug">
  .container(class:stopped='{$stopped}' on:mousedown|self|preventDefault)
    .left
      +if('!$stopped')
        .name {$playingTrack.name}
        .artist {$playingTrack.artist}
    .middle
      .controls(on:mousedown|preventDefault)
        button(tabindex=-1 on:click='{previous}')
          //- svg(xmlns='http://www.w3.org/2000/svg' height='24' viewbox='0 0 24 24' width='24')
          //-   path(d='M0 0h24v24H0z' fill='none')
          //-   path(d='M6 6h2v12H6zm3.5 6l8.5 6V6z')
          svg(xmlns='http://www.w3.org/2000/svg' height='24' viewbox='0 0 24 24' width='24')
            path(d='M7 6c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zm3.66 6.82l5.77 4.07c.66.47 1.58-.01 1.58-.82V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07c-.57.4-.57 1.24 0 1.64z')

        +if('$paused')
          button.play(tabindex=-1 on:click='{playPause}')
            //- svg(xmlns='http://www.w3.org/2000/svg' height='24' viewbox='0 0 24 24' width='24')
            //-   path(d='M0 0h24v24H0z' fill='none')
            //-   path(d='M8 5v14l11-7z')
            svg(xmlns='http://www.w3.org/2000/svg' height='24' viewbox='0 0 24 24' width='24')
              path(d='M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z')

          +else
            button.pause(tabindex=-1 on:click='{playPause}')
              //- svg(xmlns='http://www.w3.org/2000/svg' height='24' viewbox='0 0 24 24' width='24')
              //-   path(d='M0 0h24v24H0z' fill='none')
              //-   path(d='M6 19h4V5H6v14zm8-14v14h4V5h-4z')
              svg(xmlns='http://www.w3.org/2000/svg' height='24' viewbox='0 0 24 24' width='24')
                path(d='M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z')


        button(tabindex=-1 on:click='{next}')
          //- svg(xmlns='http://www.w3.org/2000/svg' height='24' viewbox='0 0 24 24' width='24')
          //-   path(d='M0 0h24v24H0z' fill='none')
          //-   path(d='M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z')
          svg(xmlns='http://www.w3.org/2000/svg' height='24' viewbox='0 0 24 24' width='24')
            path(d='M7.58 16.89l5.77-4.07c.56-.4.56-1.24 0-1.63L7.58 7.11C6.91 6.65 6 7.12 6 7.93v8.14c0 .81.91 1.28 1.58.82zM16 7v10c0 .55.45 1 1 1s1-.45 1-1V7c0-.55-.45-1-1-1s-1 .45-1 1z')
      .time-bar
        small.current-time {getDuration($currentTime)}
        input.time(tabindex=-1 type='range' min=0 max='{sliderSteps}' bind:value='{sliderValue}' on:mousedown='{sliderMousedown}' on:mouseup='{sliderMouseup}')
        small.duration {getDuration($duration)}
    .right
</template>
