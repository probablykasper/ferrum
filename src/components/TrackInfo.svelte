<script lang="ts">
  import Modal from './Modal.svelte'
  import { visible, track, image, id, loadImage } from '../stores/trackInfo'
  import { checkShortcut, focus, focusLast } from '../scripts/helpers'
  import { methods } from '../stores/data'
  import Button from './Button.svelte'
  import { showOpenDialog } from '../stores/window'

  function uintFilter(value: string) {
    return value.replace(/[^0-9]*/g, '')
  }
  function toString(value: any) {
    return String(value).replace(/\0/g, '') // remove NULL bytes
  }
  let name = ''
  let artist = ''
  let albumName = ''
  let albumArtist = ''
  let composer = ''
  let grouping = ''
  let genre = ''
  let year = ''
  $: year = uintFilter(year)
  let trackNum = ''
  let trackCount = ''
  let discNum = ''
  let discCount = ''
  let bpm = ''
  let compilation = false
  let rating = 0
  let liked = false
  let playCount = 0
  let comments = ''
  track.subscribe((track) => {
    if (track) {
      name = track.name
      artist = track.artist
      albumName = track.albumName || ''
      albumArtist = track.albumArtist || ''
      composer = track.composer || ''
      grouping = track.grouping || ''
      genre = track.genre || ''
      year = toString(track.year || '')
      trackNum = toString(track.trackNum || '')
      trackCount = toString(track.trackCount || '')
      discNum = toString(track.discNum || '')
      discCount = toString(track.discCount || '')
      bpm = toString(track.bpm || '')
      compilation = track.compilation || false
      rating = track.rating || 0
      liked = track.liked || false
      playCount = track.playCount || 0
      comments = toString(track.comments || '')
    }
  })
  function save() {
    if ($id) {
      methods.updateTrackInfo($id, {
        name,
        artist,
        albumName,
        albumArtist,
        composer,
        grouping,
        genre,
        year,
        trackNum,
        trackCount,
        // discNum,
        // discCount,
        // bpm,
        // compilation,
        // rating,
        // liked,
        // playCount,
        comments,
      })
      visible.set(false)
      focusLast()
    }
  }
  function big(v: string) {
    return v.length >= 3
  }
  function cancel() {
    visible.set(false)
    focusLast()
  }
  function keydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'escape')) {
      if (document.activeElement instanceof HTMLElement) {
        cancel()
      }
    }
  }
  function keydownNoneSelected(e: KeyboardEvent) {
    if (checkShortcut(e, 'Enter')) {
      save()
    }
  }

  let droppable = false
  const allowedMimes = ['image/jpeg', 'image/png']
  function getFilePath(e: DragEvent): string | null {
    if (e.dataTransfer && hasFile(e)) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i]
        if (allowedMimes.includes(file.type)) {
          return file.path
        }
      }
    }
    return null
  }
  function hasFile(e: DragEvent): boolean {
    if (!e.dataTransfer) return false
    let count = 0
    for (let i = 0; i < e.dataTransfer.items.length; i++) {
      const item = e.dataTransfer.items[i]
      if (item.kind === 'file' && allowedMimes.includes(item.type)) {
        count++
      }
    }
    return count === 1
  }
  function dragEnterOrOver(e: DragEvent) {
    e.preventDefault()
    droppable = hasFile(e)
  }
  function dragLeave(e: DragEvent) {
    e.preventDefault()
    droppable = false
  }
  function drop(e: DragEvent) {
    e.preventDefault()
    droppable = false
    const path = getFilePath(e)
    if (path !== null) {
      methods.setImage(0, path)
      loadImage()
    }
  }
  function coverKeydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'Backspace')) {
      methods.removeImage(0)
      loadImage()
    } else {
      keydownNoneSelected(e)
    }
  }
  async function selectCover() {
    let result = await showOpenDialog(false, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
    })
    if (!result.canceled && result.filePaths.length === 1) {
      methods.setImage(0, result.filePaths[0])
      loadImage()
    }
  }
</script>

<svelte:window on:keydown={keydown} />
<svelte:body on:keydown|self={keydownNoneSelected} />
<Modal bind:visible={$visible} close={cancel}>
  <form class="modal" on:submit|preventDefault={save}>
    <div class="header" class:has-subtitle={$image !== null && $image.total_images >= 2}>
      <div
        class="cover"
        class:droppable
        on:dragenter={dragEnterOrOver}
        on:dragover={dragEnterOrOver}
        on:dragleave={dragLeave}
        on:drop={drop}
        on:dblclick={selectCover}
        on:keydown={coverKeydown}
        tabindex="0">
        {#if $image === null}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path
              d="M23 0l-15.996 3.585v13.04c-2.979-.589-6.004 1.671-6.004 4.154 0 2.137 1.671 3.221 3.485 3.221 2.155 0 4.512-1.528 4.515-4.638v-10.9l12-2.459v8.624c-2.975-.587-6 1.664-6 4.141 0 2.143 1.715 3.232 3.521 3.232 2.14 0 4.476-1.526 4.479-4.636v-17.364z" />
          </svg>
        {:else}
          <img alt="" src={'data:' + $image.mime_type + ';base64,' + $image.data} />
        {/if}
        {#if $image !== null && $image.total_images >= 2}
          <div class="cover-subtitle">{$image.index + 1} / {$image.total_images}</div>
        {/if}
      </div>
      <div>
        <div class="name">{name}</div>
        <div class="artist">{artist}</div>
      </div>
    </div>
    <div class="spacer" />
    <div class="row">
      <div class="label">Title</div>
      <input type="text" bind:value={name} use:focus />
    </div>
    <div class="row">
      <div class="label">Artist</div>
      <input type="text" bind:value={artist} />
    </div>
    <div class="row">
      <div class="label">Album</div>
      <input type="text" bind:value={albumName} />
    </div>
    <div class="row">
      <div class="label">Album artist</div>
      <input type="text" bind:value={albumArtist} />
    </div>
    <div class="row">
      <div class="label">Composer</div>
      <input type="text" bind:value={composer} />
    </div>
    <div class="row">
      <div class="label">Grouping</div>
      <input type="text" bind:value={grouping} />
    </div>
    <div class="row">
      <div class="label">Genre</div>
      <input type="text" bind:value={genre} />
    </div>
    <div class="row">
      <div class="label">Year</div>
      <input class="medium" type="text" bind:value={year} />
    </div>
    <div class="row num">
      <div class="label">Track</div>
      <input class="num" type="text" bind:value={trackNum} class:big={big(trackNum)} />
      <div class="midtext">of</div>
      <input class="num" type="text" bind:value={trackCount} class:big={big(trackCount)} />
    </div>
    <div class="row num">
      <div class="label">Disc number</div>
      <input disabled class="num" type="text" bind:value={discNum} class:big={big(discNum)} />
      <div class="midtext">of</div>
      <input disabled class="num" type="text" bind:value={discCount} class:big={big(discCount)} />
    </div>
    <div class="row">
      <div class="label">Compilation</div>
      <p>{compilation ? 'Yes' : 'No'}</p>
    </div>
    <div class="row">
      <div class="label">Rating</div>
      <p>{rating}, {liked ? 'Liked' : 'Not Liked'}</p>
    </div>
    <div class="row">
      <div class="label">BPM</div>
      <input disabled class="medium" type="text" bind:value={bpm} />
    </div>
    <div class="row">
      <div class="label">Play count</div>
      <p>{playCount}</p>
    </div>
    <div class="row">
      <div class="label">Comments</div>
      <input type="text" bind:value={comments} />
    </div>
    <div class="spacer" />
    <div class="bottom">
      <Button secondary on:click={cancel}>Cancel</Button><Button submit>Save</Button>
    </div>
  </form>
</Modal>

<style lang="sass">
  $cover-size: 90px
  .modal
    width: 450px
  .header
    display: flex
    align-items: center
    min-height: $cover-size
    &.has-subtitle
      margin-bottom: 7px
  .spacer
    height: 15px
  .name
    font-size: 18px
    font-weight: 500
  .artist
    font-size: 13px
    opacity: 0.7
  .cover
    margin-right: 20px
  .cover
    position: relative
    transition: box-shadow 40ms ease-out
    outline: none
    &:focus
      box-shadow: 0px 0px 0px 2px var(--accent-1)
    &.droppable
      box-shadow: 0px 0px 0px 2px var(--accent-1)
    &:focus.droppable
      box-shadow: 0px 0px 0px 4px var(--accent-1)
    img
      display: block
      width: $cover-size
      flex-shrink: 0
    svg
      display: block
      padding: 26px
      width: $cover-size
      height: $cover-size
      box-sizing: border-box
      background: var(--empty-cover-bg-color)
      fill: var(--empty-cover-color)
      border-radius: 2px
  .cover-subtitle
    position: absolute
    font-size: 11px
    opacity: 0.8
    width: 100%
    text-align: center
  .row
    padding: 2px 0px
    display: flex
    align-items: center
  input
    flex-grow: 1
    font-size: 13px
    padding: 3px 4px
    background-color: transparent
    color: inherit
    border: 1px solid rgba(#ffffff, 0.25)
    box-sizing: border-box
    &[disabled]
      opacity: 0.4
    &.num
      width: 30px
      flex-grow: 0
    &.big
      width: 50px
      flex-grow: 0
    &.medium
      width: 80px
      flex-grow: 0
    &:focus
      outline: 2px solid var(--accent-1)
      outline-offset: -1px
  p
    padding: 3px 0px
    font-size: 13px
    margin: 0px
  .label
    display: inline-block
    text-align: right
    width: 80px
    margin-right: 8px
    font-size: 12px
    opacity: 0.7
  .midtext
    display: inline-block
    width: 20px
    text-align: center
  .bottom
    display: flex
    justify-content: flex-end
</style>
