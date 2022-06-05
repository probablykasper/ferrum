<script lang="ts" context="module">
  import { writable } from 'svelte/store'
  import { checkShortcut, focus, focusLast } from '../lib/helpers'
  import { visibleModalsCount } from '../lib/modals'

  const parentId = writable('root')
  export const visible = (() => {
    const store = writable(false)
    return {
      subscribe: store.subscribe,
      open(newParentId: string) {
        if (visibleModalsCount.get() == 0) {
          parentId.set(newParentId)
          store.set(true)
        }
      },
      close() {
        store.set(false)
      },
    }
  })()
  visible.subscribe((newValue) => {
    if (newValue === false) {
      focusLast()
    }
  })
</script>

<script lang="ts">
  import { onDestroy } from 'svelte'
  import { ipcRenderer } from '../lib/window'
  import { newPlaylist } from '../lib/data'
  import Modal from './Modal.svelte'
  import Button from './Button.svelte'

  let title = ''
  let description = ''
  function rows(value: string) {
    const matches = value.match(/\n/g) || []
    return Math.max(3, Math.min(matches.length + 1, 10))
  }
  $: if ($visible) {
    title = ''
    description = ''
  }

  function save() {
    newPlaylist(title, description, false, $parentId)
    visible.close()
  }
  function keydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'escape')) {
      if (document.activeElement instanceof HTMLElement) {
        visible.close()
      }
    }
  }

  function open() {
    visible.open('root')
  }
  ipcRenderer.on('newPlaylist', open)
  onDestroy(() => {
    ipcRenderer.off('newPlaylist', open)
  })
</script>

<svelte:window on:keydown={keydown} />

<Modal visible={$visible} close={() => visible.close()}>
  <form class="modal" on:submit|preventDefault={save}>
    <h3>New Playlist</h3>
    <div class="spacer" />
    <input type="text" bind:value={title} use:focus placeholder="Title" />
    <textarea rows={rows(description)} bind:value={description} placeholder="Description" />
    <div class="spacer" />
    <div class="bottom">
      <Button secondary on:click={() => visible.close()}>Cancel</Button>
      <Button submit>Save</Button>
    </div>
  </form>
</Modal>

<style lang="sass">
  form
    display: flex
    flex-direction: column
    background-color: inherit
  .spacer
    height: 15px
  .bottom
    display: flex
    justify-content: flex-end
  input, textarea
    resize: none
    width: 300px
    margin: 2px 0px
    flex-grow: 1
    font-size: 13px
    font-family: inherit
    padding: 4px 6px
    background-color: inherit
    color: inherit
    border: 1px solid rgba(#ffffff, 0.25)
    box-sizing: border-box
    &:focus
      outline: 2px solid var(--accent-1)
      outline-offset: -1px
</style>
