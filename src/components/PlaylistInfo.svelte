<script lang="ts" context="module">
  import { get, writable } from 'svelte/store'
  import { checkShortcut, focus, focusLast } from '../lib/helpers'
  import { visibleModalsCount } from '../lib/modals'
  import { newPlaylist, PlaylistInfo, trackLists, updatePlaylist } from '../lib/data'

  const editMode = writable(false)
  const info = writable(null as PlaylistInfo | null)

  export function edit(id: string, isFolder: boolean) {
    if (visibleModalsCount.get() == 0) {
      const list = get(trackLists)[id]
      if (list.type !== 'special') {
        editMode.set(true)
        info.set({
          name: list.name,
          description: list.description || '',
          isFolder: isFolder,
          id,
        })
      }
    }
  }
  export function openNew(parentId: string, isFolder: boolean) {
    if (visibleModalsCount.get() == 0) {
      editMode.set(false)
      info.set({
        name: '',
        description: '',
        isFolder: isFolder,
        id: parentId,
      })
    }
  }
  function close() {
    info.set(null)
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
    if ($info) {
      if ($editMode) {
        updatePlaylist($info.id, $info.name, $info.description)
      } else {
        newPlaylist($info)
      }
      close()
    }
  }

  function keydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'escape')) {
      if (document.activeElement instanceof HTMLElement) {
        close()
      }
    }
  }
  function formKeydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'enter', { cmdOrCtrl: true })) {
      save()
    }
  }

  function newPlaylistHandler() {
    openNew('root', false)
  }
  function newPlaylistFolderHandler() {
    openNew('root', true)
  }
  ipcRenderer.on('newPlaylist', newPlaylistHandler)
  ipcRenderer.on('newPlaylistFolder', newPlaylistFolderHandler)
  onDestroy(() => {
    ipcRenderer.off('newPlaylist', newPlaylistHandler)
    ipcRenderer.off('newPlaylistFolder', newPlaylistFolderHandler)
  })
</script>

<svelte:window on:keydown={keydown} />

{#if $info}
  <Modal showIf={true} onClose={close}>
    <form class="modal" on:submit|preventDefault={save} on:keydown={formKeydown}>
      <h3>
        {$editMode ? 'Edit' : 'New'} Playlist {#if $info.isFolder}Folder{/if}
      </h3>
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
{/if}

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
