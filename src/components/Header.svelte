<script lang="ts">
	import { is_mac } from '@/lib/data'
	import { modal_count } from './Modal.svelte'
	import { queue_visible } from '@/lib/queue'

	export let title: string
	export let subtitle: string
	export let description: string | undefined
</script>

<div class="relative px-5 pt-4 pb-5">
	<div
		class="absolute top-0 left-0 h-10 w-full"
		class:dragbar={$modal_count === 0 && is_mac}
		class:queue-visible={$queue_visible}
	></div>
	<h3 class="m-0 pb-0.5 text-[19px] leading-none font-medium">
		{title}
		<div class="text-[13px] leading-4 opacity-70">{subtitle}</div>
	</h3>
	{#if description}
		<div class="mt-2.5 text-sm text-[13px] opacity-70">{description}</div>
	{/if}
</div>

<style>
	.dragbar {
		-webkit-app-region: drag;
	}
	.queue-visible {
		width: calc(100% - var(--right-sidebar-width));
	}
</style>
