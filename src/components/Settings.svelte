<script lang="ts">
	import Modal from './Modal.svelte'
	import Button from './Button.svelte'
	import { save_view_options, view_options } from '$lib/data'

	export let on_close: () => void

	let auto_update = !view_options.noAutoUpdate

	function save() {
		view_options.noAutoUpdate = !auto_update
		save_view_options(view_options)
		on_close()
	}
</script>

<Modal on_cancel={on_close} cancel_on_escape form={save} title="Settings">
	<div class="w-96 text-sm">
		<label class="flex items-center gap-2">
			<input
				type="checkbox"
				class="size-3.5 border-gray-300 bg-gray-100 text-blue-600 outline-offset-2 outline-blue-500 outline-solid focus-visible:outline"
				bind:checked={auto_update}
			/>
			Automatically check for updates on startup
		</label>
	</div>
	<svelte:fragment slot="buttons">
		<Button secondary on:click={on_close}>Cancel</Button>
		<Button type="submit" on:click={save}>Save</Button>
	</svelte:fragment>
</Modal>
