<script lang="ts">
  import { page } from '@/lib/data'

  $: artists = page.get_artists()
</script>

<div class="size-full overflow-y-auto">
  {#each artists as artist}
    <p class="block">{artist}</p>
  {/each}
</div>
