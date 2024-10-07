<script lang="ts">
	import { ipc_renderer } from '@/lib/window'
	import Modal from './Modal.svelte'
	import Button from './Button.svelte'

	let latest_update: Awaited<ReturnType<typeof check>> | null = null

	check()
	async function check() {
		if (!window.navigator.onLine) {
			return
		}
		const result = await ipc_renderer.invoke('check_for_updates')
		if (!result || result.channel.version === result.app_version) {
			return
		}

		latest_update = result
		return result
	}
</script>

{#if latest_update}
	{@const url = latest_update.channel.url}
	<Modal
		on_cancel={() => (latest_update = null)}
		cancel_on_escape
		form={() => ipc_renderer.invoke('open_url', url)}
		title="A new version of Ferrum is available!"
	>
		<div class="max-w-xl text-sm">
			<p class="pb-3">
				Ferrum {latest_update.channel.version} is available. You are currently on {latest_update.app_version}
			</p>
			<p class="pb-1 font-semibold">Release notes:</p>
			<p class="max-h-72 overflow-y-auto whitespace-pre-wrap rounded bg-black/30 py-2 px-3">
				{latest_update.body}
			</p>
		</div>
		<svelte:fragment slot="buttons">
			<Button secondary on:click={() => (latest_update = null)}>Later</Button>
			<Button on:click={() => ipc_renderer.invoke('open_url', url)}>Update</Button>
		</svelte:fragment>
	</Modal>
{/if}
