<script lang="ts">
  import type { TrackList, Folder } from '../stores/libraryTypes'
  import { trackLists, page } from '../stores/data'
  import { ipcRenderer } from '../stores/window'
  import { visible as playlistModalVisible } from './PlaylistInfo.svelte'

  export let trackList: Folder
  let childLists: TrackList[] = []
  $: {
    childLists = []
    for (const id of trackList.children) {
      const tl = $trackLists[id]
      tl.id = id
      childLists.push(tl)
    }
  }
  function open(id: string) {
    if ($page.id !== id) page.openPlaylist(id)
  }
  async function folderContextMenu(folderId: string) {
    const clickedId = await ipcRenderer.invoke('showPlaylistMenu')
    if (clickedId === null) return
    if (clickedId === 'New Playlist') {
      playlistModalVisible.open(folderId)
    } else {
      console.error('Unknown contextMenu ID', clickedId)
    }
  }
</script>

{#each childLists as childList}
  {#if childList.type === 'folder'}
    <div
      class="item"
      class:show={childList.show}
      on:click={() => (childList.show = !childList.show)}
      on:contextmenu={() => folderContextMenu(childList.id)}>
      <svg
        class="arrow"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24">
        <path d="M21 12l-18 12v-24z" />
      </svg>
      <div class="text">{childList.name}</div>
    </div>
    <div class="sub" class:show={childList.show}>
      <svelte:self trackList={childList} />
    </div>
  {:else if childList.type === 'playlist'}
    <div
      class="item"
      on:mousedown={() => open(childList.id)}
      class:active={$page.id === childList.id}>
      <div class="arrow" />
      <div class="text">{childList.name}</div>
    </div>
  {:else}
    <div
      class="item"
      on:mousedown={() => open(childList.id)}
      class:active={$page.id === childList.id}>
      <div class="arrow" />
      <div class="text">
        {#if childList.id === 'root'}
          Songs
        {:else}
          {childList.name}
        {/if}
      </div>
    </div>
  {/if}
{/each}

<style lang="sass">
  $hue: 230
  :global(:focus)
    .item.active
      background: linear-gradient(90deg, hsl($hue, 40%, 30%) 30%, #ffffff00)
  .item
    height: 24px
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    position: relative
    display: flex
    align-items: center
    margin-right: 10px
    box-sizing: border-box
    &.active
      box-shadow: inset 2px 0px 0px 0px hsl($hue, 70%, 60%)
      background: linear-gradient(90deg, hsl($hue, 35%, 25%) 30%, #ffffff00)
  .sub
    margin-left: calc(2px + 6px*2)
    display: none
    &.show
      display: block
  .show > svg.arrow
    transform: rotate(90deg)
  .arrow
    margin-left: 2px
    padding: 6px
    width: 6px
    height: 6px
    flex-shrink: 0
    fill: white
  .text
    overflow: hidden
    text-overflow: ellipsis
    padding-right: 10px
</style>
