<script lang="ts" context="module">
  import { writable } from 'svelte/store'
  import { checkShortcut, focus, focusLast } from '../lib/helpers'
  import { visibleModalsCount } from '../lib/modals'
  import { newPlaylist, PlaylistInfo } from '../lib/data'

  const visible = writable(false)
  const createFolder = writable(false)
  const info = writable({
    parentId: 'root',
    name: '',
    description: '',
  } as PlaylistInfo)
  export function open(parentId: string, newIsFolder: boolean) {
    if (visibleModalsCount.get() == 0) {
      info.set({
        parentId,
        name: '',
        description: '',
      })
      createFolder.set(newIsFolder)
      visible.set(true)
    }
  }
  function close() {
    visible.set(false)
    focusLast()
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte'
  import { ipcRenderer } from '../lib/window'
  import Modal from './Modal.svelte'
  import Button from './Button.svelte'

  function rows(value: string) {
    const matches = value.match(/\n/g) || []
    return Math.max(3, Math.min(matches.length + 1, 10))
  }

  function save() {
    newPlaylist($info, $createFolder)
    close()
  }

  function keydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'escape')) {
      if (document.activeElement instanceof HTMLElement) {
        close()
      }
    }
  }

  function newPlaylistHandler() {
    open('root', false)
  }
  function newPlaylistFolderHandler() {
    open('root', true)
  }
  ipcRenderer.on('newPlaylist', newPlaylistHandler)
  ipcRenderer.on('newPlaylistFolder', newPlaylistFolderHandler)
  onDestroy(() => {
    ipcRenderer.off('newPlaylist', newPlaylistHandler)
    ipcRenderer.off('newPlaylistFolder', newPlaylistFolderHandler)
  })
</script>

<svelte:window on:keydown={keydown} />

<Modal showIf={$visible} onClose={close}>
  <form class="modal" on:submit|preventDefault={save}>
    {#if $createFolder}
      <h3>New Playlist Folder</h3>
    {:else}
      <h3>New Playlist</h3>
    {/if}
    <div class="spacer" />
    <input type="text" bind:value={$info.name} use:focus placeholder="Title" />
    <textarea
      rows={rows($info.description)}
      bind:value={$info.description}
      placeholder="Description"
    />
    <div class="spacer" />
    <div class="bottom">
      <Button secondary on:click={close}>Cancel</Button>
      <Button type="submit">Save</Button>
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
