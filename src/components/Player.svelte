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
    playingId,
    coverSrc,
  } from '../stores/player'
  import { getDuration } from '../scripts/helpers'
  import { queueVisible, toggleQueueVisibility } from '../stores/queue'
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
  svg
    fill: var(--icon-color)
    width: 24px
    height: 24px
  .player
    display: flex
    height: 80px
    padding: 8px
    box-sizing: border-box
    align-items: center
    border-top: 1px solid var(--border-color)
    background-color: var(--player-bg-color)
    // --gradient: linear-gradient(-90deg, #606c88, #3f4c6b)
    // --gradient: linear-gradient(-90deg, #ea7bb8, #BB377D)
    // --gradient: linear-gradient(90deg, #2847e2, #872edc)
    // --gradient: linear-gradient(90deg, #4C48F6, #4F7CF7)
    // --gradient: linear-gradient(90deg, #2d44b9, #2847e2, #2d44b9)
    // --gradient: linear-gradient(90deg, #EE6957, #F2C251)
    // --gradient: linear-gradient(90deg, #1599a8, #00c295)
  .stopped .middle
    pointer-events: none
    opacity: 0.25
  .left
    width: 30%
    display: flex
    height: 100%
    img.cover
      height: 100%
      max-width: 120px
      object-fit: contain
    svg.cover
      height: 100%
      padding: 18px
      width: auto
      box-sizing: border-box
      background: var(--empty-cover-bg-color)
      fill: var(--empty-cover-color)
      border-radius: 2px
    .track-info
      margin-left: 15px
      display: flex
      flex-direction: column
      justify-content: center
      .name
        font-size: 14px
      .artist
        font-size: 12px
        opacity: 0.8
  .middle
    width: 40%
  .right
    width: 30%
    display: flex
    justify-content: flex-end
    padding-right: 8px
    box-sizing: border-box
  button
    background-color: transparent
    outline: none
    border: none
    padding: 0px
    opacity: 0.7
    &:hover
      opacity: 1
  button.play, button.pause
    margin: 0px 15px
    svg
      width: 36px
      height: 36px
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
  .on svg
      fill: #20f39f
</style>

<template lang="pug">
  .player(class:stopped='{$stopped}' on:mousedown|self|preventDefault)
    .left
      +if('!$stopped')
        +if('$coverSrc')
          img.cover(alt="" src='{$coverSrc}')
          +else
            svg.cover(xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24')
              path(d='M23 0l-15.996 3.585v13.04c-2.979-.589-6.004 1.671-6.004 4.154 0 2.137 1.671 3.221 3.485 3.221 2.155 0 4.512-1.528 4.515-4.638v-10.9l12-2.459v8.624c-2.975-.587-6 1.664-6 4.141 0 2.143 1.715 3.232 3.521 3.232 2.14 0 4.476-1.526 4.479-4.636v-17.364z')

        .track-info
          .name {$playingTrack.name}
          .artist {$playingTrack.artist}
    .middle
      .controls(on:mousedown|preventDefault)
        button(tabindex=-1 on:click='{previous}')
          svg(xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24')
            path(d='M7 6c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zm3.66 6.82l5.77 4.07c.66.47 1.58-.01 1.58-.82V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07c-.57.4-.57 1.24 0 1.64z')

        +if('$paused')
          button.play(tabindex=-1 on:click='{playPause}')
            svg(xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24')
              path(d='M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z')

          +else
            button.pause(tabindex=-1 on:click='{playPause}')
              svg(xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24')
                path(d='M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z')

        button(tabindex=-1 on:click='{next}')
          svg(xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24')
            path(d='M7.58 16.89l5.77-4.07c.56-.4.56-1.24 0-1.63L7.58 7.11C6.91 6.65 6 7.12 6 7.93v8.14c0 .81.91 1.28 1.58.82zM16 7v10c0 .55.45 1 1 1s1-.45 1-1V7c0-.55-.45-1-1-1s-1 .45-1 1z')
      .time-bar
        small.current-time {getDuration($currentTime)}
        input.time(tabindex=-1 type='range' min=0 max='{sliderSteps}' bind:value='{sliderValue}' on:mousedown='{sliderMousedown}' on:mouseup='{sliderMouseup}')
        small.duration {getDuration($duration)}
    .right
      button.queue(on:click='{toggleQueueVisibility}' class:on='{$queueVisible}')
        svg(xmlns='http://www.w3.org/2000/svg' height='24px' viewBox='0 0 24 24' width='24px')
          path(d='M5 10h10c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm0-4h10c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm0 8h6c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm9 .88v4.23c0 .39.42.63.76.43l3.53-2.12c.32-.19.32-.66 0-.86l-3.53-2.12c-.34-.19-.76.05-.76.44z')
</template>
