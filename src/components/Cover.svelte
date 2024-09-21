<script lang="ts">
	import { paths } from '@/lib/data'
	import type { Track } from '../../ferrum-addon'
	import { join_paths } from '@/lib/window'

	export let track: Track

	let success: boolean | null = null
</script>

{#if success === false}
	<svg class="cover" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
		<path
			d="M23 0l-15.996 3.585v13.04c-2.979-.589-6.004 1.671-6.004 4.154 0 2.137 1.671 3.221 3.485 3.221 2.155 0 4.512-1.528 4.515-4.638v-10.9l12-2.459v8.624c-2.975-.587-6 1.664-6 4.141 0 2.143 1.715 3.232 3.521 3.232 2.14 0 4.476-1.526 4.479-4.636v-17.364z"
		/>
	</svg>
{:else}
	<img
		class="cover poinraer-events-none"
		class:invisible={success === null}
		src="trackimg:?path={encodeURIComponent(
			join_paths(paths.tracksDir, track.file),
		)}&cache_db_path={encodeURIComponent(paths.cacheDb)}&date_modified={encodeURIComponent(
			track.dateModified,
		)}"
		alt=""
		on:load={() => {
			success = true
		}}
		on:error={() => {
			success = false
		}}
	/>
{/if}

<style lang="sass">
	.cover
		width: 18px
		min-width: 18px
		height: 18px
		min-height: 18px
		margin: 3px 0px
		pointer-events: none
	.invisible
		opacity: 0
	img
		object-fit: contain
	svg
		padding: 5px
		box-sizing: border-box
		background: var(--empty-cover-bg-color)
		fill: var(--empty-cover-color)
		border-radius: 2px
</style>
