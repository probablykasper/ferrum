<script lang="ts">
  import { onDestroy } from 'svelte'
  import { checkShortcut } from '../lib/helpers'
  import { ipcListen } from '@/lib/window'
  import fuzzysort from 'fuzzysort'
  import { page, trackListsDetailsMap } from '@/lib/data'
  import type { TrackListDetails } from '../../ferrum-addon/addon'

  let value = ''
  let playlists: TrackListDetails[] = []
  let show = false
  $: if (show) {
    playlists = Object.values($trackListsDetailsMap).sort((a, b) => a.name.localeCompare(b.name))
  }

  let filteredItems = fuzzysort.go(value, playlists, { key: 'name', all: true })
  $: {
    filteredItems = fuzzysort.go(value, playlists, { key: 'name', all: true })
    clampIndex()
  }

  let lastActiveElement: Element | null = null
  function focusInput(el: HTMLInputElement) {
    if (lastActiveElement === null) {
      lastActiveElement = document.activeElement
    }
    el.focus()
    el.select()
    return {
      destroy() {
        if (lastActiveElement instanceof HTMLElement) {
          lastActiveElement.focus()
          lastActiveElement = null
        }
      },
    }
  }

  let selectedIndex = 0

  function clampIndex() {
    selectedIndex = Math.max(0, Math.min(filteredItems.length - 1, selectedIndex))
  }
  $: listItems, clampIndex()
  let listItems: HTMLElement[] = []

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      e.preventDefault()
    } else if (checkShortcut(e, 'Escape')) {
      show = false
      value = ''
    } else if (checkShortcut(e, 'Enter')) {
      page.openPlaylist(filteredItems[selectedIndex].obj.id)
      show = false
    } else if (checkShortcut(e, 'ArrowUp')) {
      selectedIndex--
      clampIndex()
      listItems[selectedIndex].scrollIntoView({
        block: 'nearest',
      })
      e.preventDefault()
    } else if (checkShortcut(e, 'ArrowDown')) {
      selectedIndex++
      clampIndex()
      listItems[selectedIndex].scrollIntoView({
        block: 'nearest',
      })
      e.preventDefault()
    }
  }

  onDestroy(
    ipcListen('ToggleQuickNav', () => {
      show = !show
    })
  )

  // Prevent clicks where the mousedown or mouseup happened on a child element. This could've
  // been solved with a non-parent backdrop element, but that interferes with text selection.
  let clickable = true
</script>

<svelte:body
  on:click={() => {
    clickable = true
  }}
/>

{#if show}
  <div
    class="modal"
    on:keydown
    on:click={() => {
      if (clickable) {
        show = false
      }
    }}
  >
    <div
      class="box"
      tabindex="-1"
      on:mousedown={() => {
        clickable = false
      }}
      on:mouseup={() => {
        clickable = false
      }}
    >
      <input
        type="text"
        bind:value
        on:keydown={handleKeydown}
        placeholder="Search for a playlist..."
        use:focusInput
      />
      <div class="items-container">
        {#each filteredItems as item, i}
          <button
            bind:this={listItems[i]}
            type="button"
            on:click={() => {
              page.openPlaylist(item.obj.id)
              show = false
            }}
            class:selected={selectedIndex === i}
          >
            {#if item.obj.kind === 'folder'}
              <svg
                style="padding: 1px"
                xmlns="http://www.w3.org/2000/svg"
                height="22px"
                viewBox="0 0 24 24"
                width="22px"
                fill="currentColor"
                ><path d="M0 0h24v24H0V0z" fill="none" /><path
                  d="M9.17 6l2 2H20v10H4V6h5.17M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
                /></svg
              >
            {:else}
              <svg
                style="transform: translateX(2px)"
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 0 24 24"
                width="24px"
                fill="currentColor"
                ><path
                  d="M5 10h10c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm0-4h10c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm0 8h6c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm9 .88v4.23c0 .39.42.63.76.43l3.53-2.12c.32-.19.32-.66 0-.86l-3.53-2.12c-.34-.19-.76.05-.76.44z"
                /></svg
              >
            {/if}
            <span>{item.obj.name}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style lang="sass">
  .modal
    background-color: rgba(#000000, 0.5)
    outline: none
    position: fixed
    user-select: text
    z-index: 90
    width: 100%
    height: 100%
    top: 0
    left: 0
    display: flex
    align-items: center
    justify-content: center
    padding: 20px
    box-sizing: border-box
  .box
    background-color: #191B20
    border: 1px solid rgba(#ffffff, 0.2)
    width: 90%
    max-width: 600px
    height: 360px
    max-height: 100%
    box-sizing: border-box
    border-radius: 7px
    box-shadow: 0px 0px 30px 0px rgba(#000000, 0.5)
    z-index: 100
    outline: none
    display: flex
    flex-direction: column
  input
    font-size: inherit
    font-family: inherit
    padding: 16px 20px
    border-radius: 7px
    width: 100%
    box-sizing: border-box
    outline: none
    border: none
    background-color: #191B20
    color: inherit
  .items-container
    border-top: 1px solid rgba(#ffffff, 0.08)
    padding: 8px
    scroll-padding: 8px
    overflow-y: auto
  button
    color: inherit
    font-size: inherit
    font-family: inherit
    background-color: inherit
    border: none
    display: flex
    align-items: center
    gap: 10px
    border-radius: 7px
    width: 100%
    padding: 10px
    &:hover
      background-color: rgba(#ffffff, 0.05)
    &.selected
      background-color: rgba(#ffffff, 0.15)
</style>
