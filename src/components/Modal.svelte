<script lang="ts" context="module">
  import { writable } from 'svelte/store'

  export const modalCount = writable(0)
</script>

<script lang="ts">
  import { onDestroy } from 'svelte'
  import { checkShortcut } from '../lib/helpers'

  export let onCancel: () => void
  export let cancelOnEscape = false
  export let form: (() => void) | undefined = undefined
  $: tag = form === undefined ? 'div' : 'form'

  $modalCount += 1
  onDestroy(() => {
    $modalCount -= 1
  })

  let lastActiveElement: Element | null = null

  function focus(el: HTMLElement) {
    if (lastActiveElement === null) {
      lastActiveElement = document.activeElement
    }
    el.focus()
  }

  function focusTrap(el: HTMLElement) {
    function getFocusElements() {
      return el.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    }

    if (lastActiveElement === null) {
      lastActiveElement = document.activeElement || document.body
      el.focus()
    }

    function handleKeydown(e: KeyboardEvent) {
      if (checkShortcut(e, 'Tab', { shift: true })) {
        const focusElements = getFocusElements()
        const lastFocusElement = focusElements[focusElements.length - 1]
        if (
          focusElements[0] &&
          document.activeElement?.isSameNode(focusElements[0]) &&
          lastFocusElement instanceof HTMLElement
        ) {
          lastFocusElement.focus()
          e.preventDefault()
        }
      } else if (checkShortcut(e, 'Tab')) {
        const focusElements = getFocusElements()
        const lastFocusElement = focusElements[focusElements.length - 1]
        if (
          document.activeElement?.isSameNode(lastFocusElement) &&
          focusElements[0] instanceof HTMLElement
        ) {
          focusElements[0].focus()
          e.preventDefault()
        }
      } else if (checkShortcut(e, 'Escape') && cancelOnEscape) {
        onCancel()
      }
    }
    el.addEventListener('keydown', handleKeydown)
    return {
      destroy() {
        el.removeEventListener('keydown', handleKeydown)
        if (lastActiveElement instanceof HTMLElement) {
          lastActiveElement.focus()
        }
      },
    }
  }

  function boxKeydown(e: KeyboardEvent) {
    if (form && checkShortcut(e, 'Enter')) {
      form()
      e.preventDefault()
    }
  }
</script>

<div class="container" on:keydown>
  <div class="backdrop" on:click={onCancel} on:mousedown|preventDefault />
  <svelte:element
    this={tag}
    class="box"
    on:submit|preventDefault={form}
    use:focusTrap
    tabindex="-1"
    on:keydown|self={boxKeydown}
  >
    <slot {focus} />
    {#if $$slots.buttons}
      <div class="buttons">
        <slot name="buttons" />
      </div>
    {/if}
  </svelte:element>
</div>

<style lang="sass">
  .backdrop
    background-color: rgba(#000000, 0.5)
    outline: none
  .backdrop, .container
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
    max-width: 100%
    max-height: 100%
    padding: 20px 20px
    box-sizing: border-box
    border-radius: 7px
    box-shadow: 0px 0px 30px 0px rgba(#000000, 0.5)
    overflow: auto
    z-index: 100
    outline: none
  .buttons
    display: flex
    justify-content: flex-end
</style>
