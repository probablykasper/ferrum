<script lang="ts">
  import commands from '$lib/commands'
  import { open } from '@tauri-apps/plugin-dialog';
  import type { LibraryTauri } from '../../bindings'
  import { readTextFile } from '@tauri-apps/plugin-fs'
	import Library from './Library.svelte'


  let library = $state<LibraryTauri | null>(null);
  let loading = $state(false);
  let error = $state('');

  // ── Library loading ────────────────────────────────────────────────────────

  async function open_library() {
    const path = await open({
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!path) return;

    loading = true;
    library = null
    error = '';
    try {
      const contents = await readTextFile(path);
      const result = await commands.loadLibrary(contents);
      if (result.status === 'ok') {
        library = result.data;
      } else {
        error = result.error;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load library';
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex flex-col h-screen bg-neutral-950 text-neutral-200 text-sm overflow-hidden scheme-dark">
  {#if error}
    <div class="px-4 py-2.5 bg-red-950 border-b border-red-900 text-red-400 text-xs shrink-0">⚠ {error}</div>
  {/if}

		{#snippet open_button()}
	    <button
	      type="button"
	      onclick={open_library}
	      disabled={loading}
	      class="shrink-0 px-3 py-1.5 bg-neutral-100 text-neutral-900 rounded-lg font-semibold text-xs hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
	    >
	      {loading ? 'Loading…' : 'Open'}
	    </button>
		{/snippet}


  {#if library}
	  <Library {library} {open_button} />
  {:else}
    <div class="flex flex-col items-center justify-center flex-1 gap-4 text-neutral-700 px-8 text-center">
      <span class="text-5xl">♪</span>
      <div>
        <p class="font-medium text-neutral-500">No library loaded</p>
        <div class="mt-4">
	        {@render open_button()}
        </div>
      </div>
    </div>
	{/if}
</div>
