<script lang="ts">
  import { filter, page } from '@/lib/data'
  import fuzzysort from 'fuzzysort'

  $: all_artists = page.get_artists()
  $: artists = fuzzysort.go($filter, all_artists, { all: true })
</script>

<div class="size-full overflow-y-auto p-3">
  {#each artists as artist}
    {#if artist.target}
      <p class="block py-1">{artist.target}</p>
    {:else}
      <p class="block py-1 text-current">Unknown Artist</p>
    {/if}
  {/each}
</div>
