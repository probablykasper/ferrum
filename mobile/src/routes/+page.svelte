<script lang="ts">
	import commands from '$lib/commands'
  import { open } from '@tauri-apps/plugin-dialog';
	import type { Track } from '../../bindings'
	import { readTextFile } from '@tauri-apps/plugin-fs'

  let tracks: Track[] = [];
  let loading = false;
  let error = '';
  let msg = ''

  async function open_library() {
  msg = 'Loading...'
    const path = await open({
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!path) return;

    loading = true;
    error = '';
	    const contents = await readTextFile(path);
      const result = await commands.loadLibrary(contents);
		  msg = 'Loaded' + JSON.stringify(result)
      if (result.status === 'ok') {
        tracks = result.data;
      } else {
        error = result.error;
      }
  }
</script>

<main class="p-6">
  <button
  type='button'
    onclick={open_library}
    disabled={loading}
    class="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
  >
    {loading ? 'Loading...' : 'Open Library'}
  </button>

  {#if error}
    <p class="mt-4 text-red-500">{error}</p>
  {/if}

  {#if tracks.length > 0}
    <p class="mt-4 text-sm text-gray-500">{tracks.length} tracks</p>
    <ul class="mt-2 divide-y divide-gray-200">
      {#each tracks as track}
        <li class="py-3">
          <p class="font-medium">{track.name}</p>
          {#if track.artist}
            <p class="text-sm text-gray-500">{track.artist}</p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</main>
