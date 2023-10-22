<script lang="ts">
  import { checkShortcut } from '../lib/helpers'
  import { newPlaylist, type PlaylistInfo, updatePlaylist } from '../lib/data'
  import Modal from './Modal.svelte'
  import Button from './Button.svelte'

  export let info: PlaylistInfo
  export let cancel: () => void

  function rows(value: string) {
    const matches = value.match(/\n/g) || []
    return Math.max(3, Math.min(matches.length + 1, 10))
  }

  function save() {
    if (info.editMode) {
      updatePlaylist(info.id, info.name, info.description)
    } else {
      newPlaylist(info)
    }
    cancel()
  }

  function keydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'escape')) {
      if (document.activeElement instanceof HTMLElement) {
        cancel()
      }
    }
  }
  function formKeydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'enter', { cmdOrCtrl: true })) {
      save()
    }
  }
</script>

<svelte:window on:keydown={keydown} />

<Modal
  onCancel={cancel}
  form={save}
  on:keydown={formKeydown}
  title={(info.editMode ? 'Edit' : 'New') + ' Playlist' + (info.isFolder ? ' Folder' : '')}
>
  <main>
    <!-- svelte-ignore a11y-autofocus -->
    <input type="text" bind:value={info.name} placeholder="Title" autofocus />
    <textarea
      rows={rows(info.description)}
      bind:value={info.description}
      placeholder="Description"
    />
  </main>
  <svelte:fragment slot="buttons">
    <Button secondary on:click={cancel}>Cancel</Button>
    <Button on:click={save}>Save</Button>
  </svelte:fragment>
</Modal>

<style lang="sass">
  main
    display: flex
    flex-direction: column
    background-color: inherit
    margin-bottom: 15px
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
