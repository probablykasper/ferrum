<script lang="ts">
  import { importItunes } from '@/lib/data'
  import { ipcRenderer } from '@/lib/window'
  import type { ImportStatus } from 'ferrum-addon/addon'
  import Button from './Button.svelte'
  import Modal from './Modal.svelte'

  export let cancel: () => void
  let filePath = ''
  let locked = false
  let status: ImportStatus | null = null

  function cancelHandler() {
    if (!locked) {
      cancel()
    }
  }

  async function selectFile() {
    locked = true
    const open = await ipcRenderer.invoke('showOpenDialog', true, {
      properties: ['openFile'],
      // filters: [{ name: 'Audio', extensions: ['mp3', 'm4a', 'opus'] }],
    })
    if (!open.canceled && open.filePaths[0]) {
      filePath = open.filePaths[0]
      try {
        status = await importItunes(filePath)
      } catch (e) {
        console.error(e)
      }
    }
    locked = false
  }
</script>

<Modal onCancel={cancelHandler} cancelOnEscape form={selectFile}>
  <main>
    {#if filePath === ''}
      <h3>Import iTunes Library</h3>
      <p>
        Select an iTunes <strong>Library.xml</strong> file. To get that file, open iTunes and click
        on
        <strong>File > Library > Export Library...</strong>
      </p>
      <p>
        All your tracks need to be downloaded for this to work. If you have tracks from iTunes
        Store/Apple Music, it might not work.
      </p>
      <p>The following will not be imported:</p>
      <ul>
        <li>
          Lyrics, Equalizer, Skip when shuffling, Remember playback position, Start time, Stop time
        </li>
        <li>Album ratings, album likes and album dislikes</li>
        <li>The following track metadata:</li>
        <li>Music videos, podcasts, audiobooks, voice memos etc.</li>
        <li>Smart playlists, Genius playlists and Genius Mix playlists</li>
        <li>View options</li>
      </ul>
      <div class="buttons">
        <Button secondary on:click={cancelHandler}>Cancel</Button>
        <Button type="submit">Select File</Button>
      </div>
    {:else if status}
      <div class="error-box">
        <h4>Errors</h4>
        {#each status.errors as error}
          <p>{error}</p>
        {/each}
      </div>
      <p>Playlists: {status.playlistsCount}</p>
      <p>Tracks: {status.tracksCount}</p>
    {:else if locked}
      Scanning...
    {:else}
      Done
    {/if}
  </main>
</Modal>

<style lang="sass">
  main
    font-size: 0.95rem
    width: 530px
    line-height: 1.5
  strong
    font-weight: normal
    background-color: hsl(0, 0%, 100%, 0.1)
    border: 1px solid hsl(0, 0%, 100%, 0.05)
    padding: 0.05em 0.25em
    border-radius: 3px
  .error-box
    background-color: hsla(0, 100%, 49%, 0.2)
    border: 1px solid hsl(0, 100%, 49%)
    border-radius: 5px
    padding: 0px 10px
  .buttons
    display: flex
    justify-content: flex-end
</style>
