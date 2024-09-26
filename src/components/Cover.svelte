<script lang="ts">
	import { paths } from '@/lib/data'
	import type { Track } from '../../ferrum-addon'
	import { join_paths } from '@/lib/window'

	export let track: Track
	$: src =
		'trackimg:?path=' +
		encodeURIComponent(join_paths(paths.tracksDir, track.file)) +
		'&cache_db_path=' +
		encodeURIComponent(paths.cacheDb) +
		'&date_modified=' +
		encodeURIComponent(track.dateModified)

	let error: { src: string; message: 404 | string | null } | false | null = null
</script>

{#if error}
	{#if error.message === null || error.message === 404}
		<svg
			class="cover"
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
		>
			<path
				d="M23 0l-15.996 3.585v13.04c-2.979-.589-6.004 1.671-6.004 4.154 0 2.137 1.671 3.221 3.485 3.221 2.155 0 4.512-1.528 4.515-4.638v-10.9l12-2.459v8.624c-2.975-.587-6 1.664-6 4.141 0 2.143 1.715 3.232 3.521 3.232 2.14 0 4.476-1.526 4.479-4.636v-17.364z"
			/>
		</svg>
	{:else}
		<svg
			class="cover error"
			xmlns="http://www.w3.org/2000/svg"
			height="24px"
			width="24px"
			viewBox="0 0 24 24"
			fill="#e8eaed"
			><path d="M0 0h24v24H0z" fill="none" /><path
				d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
			/></svg
		>
		<div
			class="error-msg duratin-100 pointer-events-none absolute fixed top-1/2 left-1/2 z-10 -translate-1/2 scale-95 rounded-md border border-white bg-black py-2 px-2.5 px-4 opacity-0 transition ease-out"
		>
			{error.message}
		</div>
	{/if}
{:else}
	<img
		class="cover"
		class:invisible={error === null}
		{src}
		alt=""
		on:load={() => {
			error = false
		}}
		on:error={async () => {
			// Yes this is dumb, but there's no way to get an error code from <img src="" />
			error = { message: null, src }
			try {
				const response = await fetch(src)
				if (src !== error.src) {
					return
				}
				if (response.status === 404) {
					error.message = 404
				} else {
					error.message = await response.text()
					console.log(`Failed to load cover (${response.status}): ${error.message}`)
				}
			} catch (_) {
				error.message = 'network'
			}
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
	img
		object-fit: contain
	svg
		padding: 5px
		box-sizing: border-box
		background: var(--empty-cover-bg-color)
		fill: var(--empty-cover-color)
		border-radius: 2px
	.error
		fill: #ef4444
		background: transparent
		padding: 3px
	:global(.image:hover) .error-msg
		scale: 1
		opacity: 100
</style>
