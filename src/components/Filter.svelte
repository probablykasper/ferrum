<script lang="ts">
	import { onDestroy } from 'svelte'
	import { filter } from '@/lib/data'
	import { ipc_listen } from '../lib/window'

	let filter_input: HTMLInputElement
	onDestroy(
		ipc_listen('filter', () => {
			filter_input.select()
		}),
	)
</script>

<input
	on:focus
	on:keydown
	bind:this={filter_input}
	type="text"
	class="search rounded-[5px] text-[13px] leading-none"
	class:on={$filter}
	bind:value={$filter}
	placeholder="Filter"
/>

<style lang="sass">
	input.search
		display: block
		width: calc(100% - 15px*2)
		margin: auto
		font-family: inherit
		padding: 5px 10px
		box-sizing: border-box
		color: inherit
		background-color: hsla(var(--hue), 68%, 90%, 0.08)
		outline: none
		border: 1px solid rgba(255, 255, 255, 0.1)
		&:focus
			background-color: hsla(var(--hue), 65%, 60%, 0.2)
			outline: 2px solid var(--accent-1)
			outline-offset: -1px
		&.on:focus
			outline: 2px solid hsl(160, 60%, 40%)
		&.on
			background-color: hsla(160, 65%, 60%, 0.15)
			border: 1px solid hsl(160, 50%, 60%, 0.2)
</style>
