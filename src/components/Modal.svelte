<script lang="ts" context="module">
  import { writable } from 'svelte/store'

  export const modalCount = writable(0)
</script>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { checkShortcut } from '../lib/helpers'

  export let onCancel: () => void
  export let cancelOnEscape = false
  export let form: (() => void) | undefined = undefined
  $: tag = form === undefined ? 'div' : 'form'
  export let title: string | null = null
  let dialogEl: HTMLDialogElement

  $modalCount += 1
  onDestroy(() => {
    $modalCount -= 1
  })

  onMount(() => {
    dialogEl.showModal()
    return () => {
      dialogEl.close()
    }
  })

  // Prevent clicks where the mousedown or mouseup happened on a child element. This could've
  // been solved with a non-parent backdrop element, but that interferes with text selection.
  let clickable = true
</script>

<svelte:body
  on:click={() => {
    clickable = true
  }}
/>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
  class="modal"
  aria-modal="true"
  bind:this={dialogEl}
  on:click|self={() => {
    if (clickable) {
      onCancel()
    }
  }}
  tabindex="-1"
  on:keydown
  on:keydown={(e) => {
    if (checkShortcut(e, 'Escape') && cancelOnEscape) {
      onCancel()
    }
  }}
  on:keydown|self={(e) => {
    if (form && checkShortcut(e, 'Enter')) {
      form()
      e.preventDefault()
    }
  }}
>
  <svelte:element
    this={tag}
    class="box"
    on:submit|preventDefault={form}
    on:mousedown={() => {
      clickable = false
    }}
    on:mouseup={() => {
      clickable = false
    }}
    role="none"
  >
    {#if title !== null}
      <h3>{title}</h3>
    {/if}
    <slot />
    {#if $$slots.buttons}
      <div class="buttons">
        <slot name="buttons" />
      </div>
    {/if}
  </svelte:element>
</dialog>

<style lang="sass">
  h3
    margin-bottom: 15px
  ::backdrop
    background-color: rgba(#000000, 0.5)
  dialog
    color: inherit
    background-color: #191B20
    border: 1px solid rgba(#ffffff, 0.2)
    box-sizing: border-box
    border-radius: 7px
    box-shadow: 0px 0px 30px 0px rgba(#000000, 0.5)
  .buttons
    display: flex
    justify-content: flex-end
</style>
