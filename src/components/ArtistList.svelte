<script lang="ts">
  import { filter, page } from '@/lib/data'
  import fuzzysort from 'fuzzysort'

  $: all_artists = page.get_artists()
  $: artists = fuzzysort.go($filter, all_artists, { all: true })
</script>

<div class="w-full border-b border-b-slate-500/30">
  <p class="px-3">(Work in progress)</p>
</div>

<div class="size-full overflow-y-auto text-sm">
  {#each artists as artist}
    <p class="block py-1 px-3 text-current">
      {#if artist.target}
        {artist.target}
      {:else}
        Unknown Artist
      {/if}
    </p>
  {/each}
</div>
