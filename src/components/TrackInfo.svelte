<script lang="ts" context="module">
  import { writable } from 'svelte/store'
  import type { Writable } from 'svelte/store'
  import { methods } from '$lib/data'
  import type { Track, Image, TrackID } from '$lib//libraryTypes'
  import { visibleModalsCount } from '$lib/modals'

  type CurrentList = {
    ids: TrackID[]
    index: number
  }
  let currentList: CurrentList | null = null

  const id: Writable<TrackID | null> = writable(null)
  const track: Writable<Track | null> = writable(null)
  const image = writable(null as null | Image)

  function openIndex(index: number) {
    if (currentList && index >= 0 && index < currentList.ids.length) {
      currentList.index = index
      id.set(currentList.ids[index])
      track.set(methods.getTrack(currentList.ids[index]))
      methods.loadTags(currentList.ids[index])
      loadImage(0)
    }
  }
  function close() {
    id.set(null)
    track.set(null)
    image.set(null)
    currentList = null
  }

  export function open(ids: string[], index: number) {
    if (visibleModalsCount.get() == 0) {
      currentList = { ids, index }
      openIndex(index)
    }
  }

  function openPrev() {
    if (currentList) openIndex(currentList.index - 1)
  }
  function openNext() {
    if (currentList) openIndex(currentList.index + 1)
  }

  function loadImage(index: number) {
    image.set(methods.getImage(index))
  }
</script>

<script lang="ts">
  import Modal from './Modal.svelte'
  import { checkShortcut, focus, focusLast } from '$lib/helpers'
  import Button from './Button.svelte'
  import { showOpenDialog } from '$lib/window'

  function uintFilter(value: string) {
    return value.replace(/[^0-9]*/g, '')
  }
  function toString(value: unknown) {
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
  function setInfo(track: Track) {
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
  $: if ($track) setInfo($track)

  function isEdited() {
    if (!$track) {
      return false
    }
    const isUnedited =
      name === $track.name &&
      artist === $track.artist &&
      albumName === ($track.albumName || '') &&
      albumArtist === ($track.albumArtist || '') &&
      composer === ($track.composer || '') &&
      grouping === ($track.grouping || '') &&
      genre === ($track.genre || '') &&
      year === toString($track.year || '') &&
      trackNum === toString($track.trackNum || '') &&
      trackCount === toString($track.trackCount || '') &&
      discNum === toString($track.discNum || '') &&
      discCount === toString($track.discCount || '') &&
      bpm === toString($track.bpm || '') &&
      compilation === ($track.compilation || false) &&
      rating === ($track.rating || 0) &&
      liked === ($track.liked || false) &&
      playCount === ($track.playCount || 0) &&
      comments === toString($track.comments || '')
    return !isUnedited
  }
  function save(hideAfter = true) {
    if ($id === null) {
      return
    }
    if (isEdited()) {
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
        discNum,
        discCount,
        bpm,
        // compilation,
        // rating,
        // liked,
        // playCount,
        comments,
      })
    }
    if (hideAfter) {
      close()
      focusLast()
    }
  }
  function big(v: string) {
    return v.length >= 3
  }
  function cancel() {
    close()
    focusLast()
  }
  function keydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'escape')) {
      if (document.activeElement instanceof HTMLElement) {
        cancel()
      }
    } else if (checkShortcut(e, '[', { cmdOrCtrl: true })) {
      save(false)
      openPrev()
    } else if (checkShortcut(e, ']', { cmdOrCtrl: true })) {
      save(false)
      openNext()
    }
  }
  function keydownNoneSelected(e: KeyboardEvent) {
    if (checkShortcut(e, 'Enter')) {
      save()
    }
  }

  function prevImage() {
    if ($image && $image.index >= 1) {
      loadImage($image.index - 1)
    }
  }
  function nextImage() {
    if ($image && $image.index < $image.total_images - 1) {
      loadImage($image.index + 1)
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
      methods.setImage($image?.index || 0, path)
      loadImage($image?.index || 0)
    }
  }
  function coverKeydown(e: KeyboardEvent) {
    if (checkShortcut(e, 'Backspace') && $image) {
      methods.removeImage($image.index)
      if ($image.index < $image.total_images - 1) {
        loadImage($image.index)
      } else {
        loadImage(Math.max(0, $image.index - 1))
      }
    } else if (checkShortcut(e, 'ArrowLeft')) {
      prevImage()
    } else if (checkShortcut(e, 'ArrowRight')) {
      nextImage()
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
      methods.setImage($image?.index || 0, result.filePaths[0])
      loadImage($image?.index || 0)
    }
  }
</script>

<svelte:window on:keydown={keydown} />
<svelte:body on:keydown|self={keydownNoneSelected} />
<Modal showIf={$id !== null} onClose={cancel}>
  <form class="modal" on:submit|preventDefault={() => save()}>
    <div class="header" class:has-subtitle={$image !== null && $image.total_images >= 2}>
      <div class="cover-area" class:droppable tabindex="0" on:keydown={coverKeydown}>
        <div
          class="cover"
          on:dragenter={dragEnterOrOver}
          on:dragover={dragEnterOrOver}
          on:dragleave={dragLeave}
          on:drop={drop}
          on:dblclick={selectCover}
        >
          {#if $image === null}
            <svg
              class="cover-svg outline-element"
              xmlns="http://www.w3.org/2000/svg"
              width="8"
              height="8"
              viewBox="0 0 24 24"
            >
              <path
                d="M23 0l-15.996 3.585v13.04c-2.979-.589-6.004 1.671-6.004 4.154 0 2.137 1.671 3.221 3.485 3.221 2.155 0 4.512-1.528 4.515-4.638v-10.9l12-2.459v8.624c-2.975-.587-6 1.664-6 4.141 0 2.143 1.715 3.232 3.521 3.232 2.14 0 4.476-1.526 4.479-4.636v-17.364z"
              />
            </svg>
          {:else}
            <img
              class="outline-element"
              alt=""
              src={'data:' + $image.mime_type + ';base64,' + $image.data}
            />
          {/if}
        </div>
        {#if $image !== null && $image.total_images >= 2}
          {@const imageIndex = $image.index}
          <div class="cover-subtitle">
            <div class="arrow" class:unclickable={imageIndex <= 0}>
              <svg
                on:click={prevImage}
                clip-rule="evenodd"
                fill-rule="evenodd"
                stroke-linejoin="round"
                stroke-miterlimit="2"
                width="18"
                height="18"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                ><path
                  d="m13.789 7.155c.141-.108.3-.157.456-.157.389 0 .755.306.755.749v8.501c0 .445-.367.75-.755.75-.157 0-.316-.05-.457-.159-1.554-1.203-4.199-3.252-5.498-4.258-.184-.142-.29-.36-.29-.592 0-.23.107-.449.291-.591 1.299-1.002 3.945-3.044 5.498-4.243z"
                /></svg
              >
            </div>
            <div class="subtitle-text">
              {$image.index + 1} / {$image.total_images}
            </div>
            <div class="arrow" class:unclickable={imageIndex >= $image.total_images - 1}>
              <svg
                on:click={nextImage}
                clip-rule="evenodd"
                fill-rule="evenodd"
                stroke-linejoin="round"
                stroke-miterlimit="2"
                width="18"
                height="18"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                ><path
                  d="m10.211 7.155c-.141-.108-.3-.157-.456-.157-.389 0-.755.306-.755.749v8.501c0 .445.367.75.755.75.157 0 .316-.05.457-.159 1.554-1.203 4.199-3.252 5.498-4.258.184-.142.29-.36.29-.592 0-.23-.107-.449-.291-.591-1.299-1.002-3.945-3.044-5.498-4.243z"
                /></svg
              >
            </div>
          </div>
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
      <input class="num" type="text" bind:value={discNum} class:big={big(discNum)} />
      <div class="midtext">of</div>
      <input class="num" type="text" bind:value={discCount} class:big={big(discCount)} />
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
      <input class="medium" type="text" bind:value={bpm} />
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
      <Button secondary on:click={cancel}>Cancel</Button><Button type="submit">Save</Button>
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
  .cover-area
    margin-right: 20px
    position: relative
    outline: none
    &:focus .outline-element
      box-shadow: 0px 0px 0px 2px var(--accent-1)
    &.droppable .outline-element
      box-shadow: 0px 0px 0px 2px var(--accent-1)
    &:focus.droppable .outline-element
      box-shadow: 0px 0px 0px 4px var(--accent-1)
  .cover
    transition: box-shadow 40ms ease-out
    width: $cover-size
    height: $cover-size
    display: flex
    align-items: center
    justify-content: center
    img
      display: block
      max-width: $cover-size
      max-height: $cover-size
    svg.cover-svg
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
    margin-top: 1px
    text-align: center
    display: flex
    align-items: center
    justify-content: center
    .subtitle-text
      width: 36px
    .arrow
      margin-top: 1px
      display: flex
      color: #ffffff
      &.unclickable
        pointer-events: none
        svg
          opacity: 0.35
    svg
      background-color: transparent
      outline: none
      border: none
      padding: 0px
      opacity: 1
      transition: 0.05s ease-out
      &:active
        opacity: 0.7
        transform: scale(0.95)
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
