<script lang="ts">
  import {
    stopped,
    paused,
    playPause,
    duration,
    currentTime,
    seek,
    playingTrack,
    playingId,
    previous,
    next,
    coverSrc,
    volume,
  } from '../lib/player'
  import { getDuration } from '../lib/helpers'
  import { queueVisible, toggleQueueVisibility, queue } from '../lib/queue'
  import { isDev, methods } from '../lib/data'
  import { showTrackMenu } from '@/lib/menus'
  import { dragged } from '@/lib/drag-drop'
  import * as dragGhost from './DragGhost.svelte'

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
  function sliderMouseup() {
    sliderBeingDragged = false
    seek((sliderValue / sliderSteps) * $duration || 0)
  }
  async function playingContextMenu() {
    const playing = queue.getCurrent()
    if (playing) {
      await showTrackMenu([playing.id])
    }
  }

  function dragStart(e: DragEvent) {
    if (e.dataTransfer && $playingId) {
      e.dataTransfer.effectAllowed = 'move'
      const track = methods.getTrack($playingId)
      dragGhost.setInnerText(track.artist + ' - ' + track.name)
      dragged.tracks = {
        ids: [$playingId],
      }
      e.dataTransfer.setDragImage(dragGhost.dragEl, 0, 0)
      e.dataTransfer.setData('ferrum.tracks', '')
    }
  }
</script>

<div class="player" class:stopped={$stopped} on:mousedown|self|preventDefault class:dev={isDev}>
  <div class="left">
    {#if !$stopped && $playingTrack}
      <div
        class="cover"
        on:contextmenu={playingContextMenu}
        on:dragstart={dragStart}
        draggable="true"
      >
        {#if $coverSrc}
          <img src={$coverSrc} alt="" draggable="false" />
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path
              d="M23 0l-15.996 3.585v13.04c-2.979-.589-6.004 1.671-6.004 4.154 0 2.137 1.671 3.221 3.485 3.221 2.155 0 4.512-1.528 4.515-4.638v-10.9l12-2.459v8.624c-2.975-.587-6 1.664-6 4.141 0 2.143 1.715 3.232 3.521 3.232 2.14 0 4.476-1.526 4.479-4.636v-17.364z"
            />
          </svg>
        {/if}
      </div>
      <div on:contextmenu={playingContextMenu} on:dragstart={dragStart} draggable="true">
        <div class="name">
          {$playingTrack.name}
        </div>
        <div class="artist">
          {$playingTrack.artist}
        </div>
      </div>
    {/if}
  </div>
  <div class="middle">
    <div class="controls" on:mousedown|preventDefault>
      <button tabindex="-1" on:click={previous}>
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
          <path
            d="M7 6c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zm3.66 6.82l5.77 4.07c.66.47 1.58-.01 1.58-.82V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07c-.57.4-.57 1.24 0 1.64z"
          />
        </svg>
      </button>

      {#if $paused}
        <button class="play" tabindex="-1" on:click={playPause}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
            <path
              d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"
            />
          </svg>
        </button>
      {:else}
        <button class="pause" tabindex="-1" on:click={playPause}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
            <path
              d="M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z"
            />
          </svg>
        </button>
      {/if}

      <button tabindex="-1" on:click={next}>
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
          <path
            d="M7.58 16.89l5.77-4.07c.56-.4.56-1.24 0-1.63L7.58 7.11C6.91 6.65 6 7.12 6 7.93v8.14c0 .81.91 1.28 1.58.82zM16 7v10c0 .55.45 1 1 1s1-.45 1-1V7c0-.55-.45-1-1-1s-1 .45-1 1z"
          />
        </svg>
      </button>
    </div>
    <div class="time-bar">
      <small class="current-time">{getDuration($currentTime)}</small>
      <input
        type="range"
        class="time"
        tabindex="-1"
        min="0"
        max={sliderSteps}
        bind:value={sliderValue}
        on:mousedown={sliderMousedown}
        on:mouseup={sliderMouseup}
      />
      <small class="duration">{getDuration($duration)}</small>
    </div>
  </div>
  <div class="right">
    <button class="volume-icon" tabindex="-1" on:click={volume.toggle}>
      {#if $volume > 0.5}
        <svg
          class="high"
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 0 24 24"
          width="24px"
          fill="#000000"
        >
          <path
            d="M3 10v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71V6.41c0-.89-1.08-1.34-1.71-.71L7 9H4c-.55 0-1 .45-1 1zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 4.45v.2c0 .38.25.71.6.85C17.18 6.53 19 9.06 19 12s-1.82 5.47-4.4 6.5c-.36.14-.6.47-.6.85v.2c0 .63.63 1.07 1.21.85C18.6 19.11 21 15.84 21 12s-2.4-7.11-5.79-8.4c-.58-.23-1.21.22-1.21.85z"
          />
        </svg>
      {:else if $volume > 0}
        <svg
          class="low"
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 0 24 24"
          width="24px"
          fill="#000000"
        >
          <path
            d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 10v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71V6.41c0-.89-1.08-1.34-1.71-.71L9 9H6c-.55 0-1 .45-1 1z"
          />
        </svg>
      {:else}
        <svg
          class="mute"
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 0 24 24"
          width="24px"
          fill="#000000"
        >
          <path
            d="M7 10v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71V6.41c0-.89-1.08-1.34-1.71-.71L11 9H8c-.55 0-1 .45-1 1z"
          />
        </svg>
      {/if}
    </button>
    <input
      type="range"
      class="volume"
      tabindex="-1"
      min="0"
      max="1"
      step="0.01"
      bind:value={$volume}
    />
    <button class="queue" tabindex="-1" on:click={toggleQueueVisibility} class:on={$queueVisible}>
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px">
        <path
          d="M5 10h10c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm0-4h10c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm0 8h6c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm9 .88v4.23c0 .39.42.63.76.43l3.53-2.12c.32-.19.32-.66 0-.86l-3.53-2.12c-.34-.19-.76.05-.76.44z"
        />
      </svg>
    </button>
  </div>
</div>

<style lang="sass">
  svg
    fill: var(--icon-color)
    width: 24px
    height: 24px
    display: block
  .player
    display: flex
    height: 80px
    padding: 8px
    box-sizing: border-box
    align-items: center
    border-top: 1px solid var(--border-color)
    background-color: var(--player-bg-color)
    &:not(:hover).dev
      background: linear-gradient(90deg, hsl(205deg 60% 15%), hsl(280deg 60% 15%))
  .stopped .middle
    pointer-events: none
    opacity: 0.25
  .left
    width: 30%
    display: flex
    align-items: center
    height: 100%
    .cover
      height: 100%
    img
      height: 100%
      max-width: 120px
      object-fit: contain
    svg
      height: 100%
      padding: 18px
      width: auto
      box-sizing: border-box
      background: var(--empty-cover-bg-color)
      fill: var(--empty-cover-color)
      border-radius: 2px
    .name
      margin-left: 15px
      font-size: 14px
    .artist
      margin-left: 15px
      font-size: 12px
      opacity: 0.8
  .middle
    width: 40%
  .right
    width: 30%
    display: flex
    justify-content: flex-end
    align-items: center
    padding-right: 8px
    box-sizing: border-box
  button
    background-color: transparent
    outline: none
    border: none
    padding: 0px
    opacity: 1
    transition: 0.05s ease-out
    &:hover
      // opacity: 0.7
    &:active
      opacity: 0.7
      transform: scale(0.95)
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
    align-items: center
    .current-time
      text-align: right
    small
      font-size: 13px
      opacity: 0.5
      min-width: 40px
      font-family: 'Open Sans' // for monospace digits
  input
    -webkit-appearance: none
    background: transparent
    padding: 5px 4px
    margin: 0px 4px
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
  input.time
    width: 100%
  .on svg
    fill: var(--icon-highlight-color)
  svg
    width: 24px
  button.volume-icon
    width: 24px
    padding-right: 4px
    box-sizing: content-box
    .high
      transform: translateX(4px)
    .low
      transform: translateX(2px)
  input.volume
    width: 100px
    margin-left: 0px
</style>
