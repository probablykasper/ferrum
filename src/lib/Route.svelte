<script lang="ts">
	import type { SvelteComponent } from 'svelte'
	import { url_pathname } from './router'

	export let route: string
	$: route_segments = route.split('/')
	$: params = parse($url_pathname)

	export let component: typeof SvelteComponent<Record<string, unknown>, Record<string, unknown>>

	function parse(pathname: string) {
		const params: Record<string, string> = {}
		const path_segments = pathname.split('/')
		if (route_segments.length !== path_segments.length) {
			return null
		}
		for (let i = 0; i < route_segments.length; i++) {
			const path_segment = path_segments[i]
			const route_segment = route_segments[i]
			if (route_segment.startsWith(':')) {
				params[route_segment.slice(1)] = path_segment
			} else if (path_segment !== route_segment) {
				return null
			}
		}
		return params
	}
</script>

{#if params}
	<svelte:component this={component} {params} />
{/if}
