<script lang="ts">
  import { methods, trackMetadataUpdated } from '@/lib/data'
  import { fade } from 'svelte/transition'
  import { onDestroy } from 'svelte'
  import type { Track } from '../../ferrum-addon'

  export let id: string

  let track: Track
  $: $trackMetadataUpdated, (track = methods.getTrack(id))

  let objectUrl: string | undefined

  let promise: Promise<string>
  $: $trackMetadataUpdated, (promise = loadCover(id))

  async function loadCover(id: string) {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }
    let buf = await methods.readCoverAsync(id)
    let url = URL.createObjectURL(new Blob([buf], {}))
    objectUrl = url
    return url
  }
  onDestroy(() => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }
  })
</script>

<div class="box">
  {#await promise then blob}
    <img class="cover" src={blob} alt="" in:fade={{ duration: 300 }} />
  {:catch}
    <svg
      class="cover"
      in:fade={{ duration: 300 }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <path
        d="M23 0l-15.996 3.585v13.04c-2.979-.589-6.004 1.671-6.004 4.154 0 2.137 1.671 3.221 3.485 3.221 2.155 0 4.512-1.528 4.515-4.638v-10.9l12-2.459v8.624c-2.975-.587-6 1.664-6 4.141 0 2.143 1.715 3.232 3.521 3.232 2.14 0 4.476-1.526 4.479-4.636v-17.364z"
      />
    </svg>
  {/await}
</div>
<div class="text">
  <p>{track.name}</p>
  <p class="artist">{track.artist}</p>
</div>

<style lang="sass">
  .text
    overflow: hidden
    white-space: nowrap
  p
    margin: 0px
    font-size: 14px
    overflow: hidden
    text-overflow: ellipsis
  .artist
    opacity: 0.75
    font-size: 12px
  .box
    width: 42px
    min-width: 42px
    height: 42px
    min-height: 42px
    margin-right: 10px
  .cover
    width: 42px
    min-width: 42px
    height: 42px
    min-height: 42px
  img.cover
    object-fit: contain
  svg.cover
    padding: 12px
    box-sizing: border-box
    background: var(--empty-cover-bg-color)
    fill: var(--empty-cover-color)
    border-radius: 2px
</style>
