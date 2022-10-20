<script lang="ts">
  import { onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'
  import TrackList from './components/TrackList.svelte'
  import Player from './components/Player.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import Queue from './components/Queue.svelte'
  import TrackInfo, { TrackInfoList } from './components/TrackInfo.svelte'
  import PlaylistInfoModal from './components/PlaylistInfo.svelte'
  import { queueVisible } from './lib/queue'
  import { ipcListen, ipcRenderer } from '@/lib/window'
  import { isMac, importTracks, PlaylistInfo, trackLists } from './lib/data'
  import { playPause } from './lib/player'
  import DragGhost from './components/DragGhost.svelte'
  import ItunesImport from './components/ItunesImport.svelte'
  import type { TrackID } from 'ferrum-addon/addon'
  import { modalCount } from './components/Modal.svelte'

  ipcRenderer.emit('appLoaded')

  async function openImportDialog() {
    if ($modalCount !== 0) {
      return
    }
    let result = await ipcRenderer.invoke('showOpenDialog', false, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio', extensions: ['mp3', 'm4a', 'opus'] }],
    })
    if (!result.canceled && result.filePaths.length >= 1) {
      importTracks(result.filePaths)
    }
  }
  ipcRenderer.on('import', openImportDialog)
  onDestroy(() => {
    ipcRenderer.removeListener('import', openImportDialog)
  })

  function toggleQueue() {
    $queueVisible = !$queueVisible
  }
  ipcRenderer.on('Toggle Queue', toggleQueue)
  onDestroy(() => {
    ipcRenderer.removeListener('Toggle Queue', toggleQueue)
  })

  let droppable = false
  const allowedMimes = ['audio/mpeg', 'audio/x-m4a', 'audio/ogg'] // mp3, m4a
  function getFilePaths(e: DragEvent): string[] {
    if (!e.dataTransfer) return []
    let validPaths: string[] = []
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      const file = e.dataTransfer.files[i]
      if (allowedMimes.includes(file.type)) {
        validPaths.push(file.path)
      }
    }
    return validPaths
  }
  function hasFiles(e: DragEvent): boolean {
    if (!e.dataTransfer) return false
    for (let i = 0; i < e.dataTransfer.items.length; i++) {
      const item = e.dataTransfer.items[i]
      if (item.kind === 'file' && allowedMimes.includes(item.type)) {
        return true
      }
    }
    return false
  }
  function dragEnterOrOver(e: DragEvent) {
    droppable = hasFiles(e)
    if (droppable) {
      e.preventDefault()
    }
  }
  function dragLeave() {
    droppable = false
  }
  function drop(e: DragEvent) {
    e.preventDefault()
    droppable = false
    const validPaths = getFilePaths(e)
    const paths = []
    for (const path of validPaths) {
      paths.push(path)
    }
    importTracks(paths)
  }
  function keydown(e: KeyboardEvent) {
    let el = e.target as HTMLAudioElement
    if (el && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
      if (e.key === ' ') {
        e.preventDefault()
        playPause()
      }
    }
  }

  let showItunesImport = false
  onDestroy(
    ipcListen('itunesImport', () => {
      if ($modalCount === 0) {
        showItunesImport = true
      }
    })
  )

  let trackInfoList: TrackInfoList | null = null
  function onTrackInfo(ids: TrackID[], trackIndex: number) {
    if ($modalCount === 0) {
      trackInfoList = { ids, index: trackIndex }
    }
  }
  onDestroy(
    ipcListen('context.Get Info', (_, ids: TrackID[], trackIndex: number) => {
      onTrackInfo(ids, trackIndex)
    })
  )

  let playlistInfo: PlaylistInfo | null = null
  onDestroy(
    ipcListen('context.playlist.edit', (_, id) => {
      const list = $trackLists[id]
      if (list.type !== 'special' && $modalCount === 0) {
        playlistInfo = {
          name: list.name,
          description: list.description || '',
          isFolder: list.type === 'folder',
          id: list.id,
          editMode: true,
        }
      }
    })
  )
  onDestroy(
    ipcListen('newPlaylist', (_, id, isFolder) => {
      playlistInfo = {
        name: '',
        description: '',
        isFolder: isFolder,
        id: id,
        editMode: false,
      }
    })
  )
</script>

<svelte:window on:keydown={keydown} />
<svelte:head>
  <title>Ferrum</title>
</svelte:head>

<main on:dragenter|capture={dragEnterOrOver}>
  <div class="meat">
    <Sidebar />
    <TrackList {onTrackInfo} />
    {#if $queueVisible}
      <Queue {onTrackInfo} />
    {/if}
  </div>
  <Player />
  {#if droppable}
    <!-- if the overlay is always visible, it's not possible to scroll while dragging tracks -->
    <div class="drag-overlay" transition:fade={{ duration: 100 }}>
      <h1>Drop files to import</h1>
    </div>
    <div class="dropzone" on:dragleave={dragLeave} on:drop={drop} on:dragover={dragEnterOrOver} />
  {/if}
</main>

{#if trackInfoList}
  <TrackInfo currentList={trackInfoList} cancel={() => (trackInfoList = null)} />
{/if}
{#if playlistInfo}
  <PlaylistInfoModal info={playlistInfo} cancel={() => (playlistInfo = null)} />
{/if}
{#if showItunesImport}
  <ItunesImport cancel={() => (showItunesImport = false)} />
{/if}

<DragGhost />

{#if isMac}
  <div class="titlebar" on:mousedown|self|preventDefault />
{/if}

<style lang="sass">
  :global(:root)
    --player-bg-color: #17181c
    --text-color: #e6e6e6
    --drag-bg-color: #1e1f24
    --drag-line-color: #0083f5
    --empty-cover-bg-color: #2b2c31
    --empty-cover-color: #45464a
    --border-color: #333333
    --accent-1: #2e5be0
    --accent-2: #103fcb
    --icon-color: #e6e6e6
    --icon-highlight-color: #00ffff
    --titlebar-height: 22px
    --hue: 225
  :global(html), :global(body)
    background-color: #0D1115
    height: 100%
  :global(body)
    position: relative
    width: 100%
    margin: 0
    box-sizing: border-box
    background-image: linear-gradient(150deg, hsl(var(--hue), 60%, 10%), hsl(var(--hue), 20%, 6%))
    color: var(--text-color)
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif
    user-select: none
  :global(h1), :global(h2), :global(h3)
    font-weight: 400
    margin: 0px
  :global(h4), :global(h5), :global(h6)
    font-weight: 600
    margin: 0px
  .dropzone, .drag-overlay
    position: fixed
    width: 100%
    height: 100%
    top: 0px
    left: 0px
  .drag-overlay
    display: flex
    align-items: center
    justify-content: center
    background-color: rgba(#10161e, 0.9)
    transition: all 100ms ease-in-out
  main
    height: 100%
    max-height: 100%
    display: flex
    flex-direction: column
  .meat
    position: relative
    height: 0px
    display: flex
    flex-direction: row
    flex-grow: 1
  .titlebar
    height: var(--titlebar-height)
    width: 100%
    top: 0px
    left: 0px
    position: absolute
    -webkit-app-region: drag
    z-index: 500
</style>
