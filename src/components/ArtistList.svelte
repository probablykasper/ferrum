<script lang="ts">
	import { filter, get_artists } from '@/lib/data'
	import fuzzysort from 'fuzzysort'
	import Header from './Header.svelte'

	$: all_artists = get_artists()
	$: artists = fuzzysort.go($filter, all_artists, { all: true })
</script>

<Header title="Artists" subtitle="{all_artists.length} artists" description={undefined} />
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
