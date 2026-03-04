<script lang="ts">
	import commands from '$lib/commands'
  import { open } from '@tauri-apps/plugin-dialog';
  import type { Track, TrackList, Playlist, LibraryTauri } from '../../bindings'
  import { readTextFile } from '@tauri-apps/plugin-fs'

  type sort_key_type = 'name' | 'artist' | 'dateAdded' | 'playCount';
  type sort_dir_type = 'asc' | 'desc';
  type active_filter_type = { kind: 'all' } | { kind: 'liked' } | { kind: 'genre'; value: string };

  let library: LibraryTauri | null = null;
  let loading = false;
  let error = '';

  let search_query = '';
  let sort_key: sort_key_type = 'name';
  let sort_dir: sort_dir_type = 'asc';
  let active_filter: active_filter_type = { kind: 'all' };
  let selected_playlist_id: string | null = null;

  async function open_library() {
    const path = await open({
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!path) return;

    loading = true;
    error = '';
    try {
      const contents = await readTextFile(path);
      const result = await commands.loadLibrary(contents);
      if (result.status === 'ok') {
        library = result.data;
        selected_playlist_id = null;
        active_filter = { kind: 'all' };
      } else {
        error = result.error;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load library';
    } finally {
      loading = false;
    }
  }

  function toggle_sort(key: sort_key_type) {
    if (sort_key === key) {
      sort_dir = sort_dir === 'asc' ? 'desc' : 'asc';
    } else {
      sort_key = key;
      sort_dir = 'asc';
    }
  }

  function sort_indicator(key: sort_key_type): string {
    if (sort_key !== key) return '';
    return sort_dir === 'asc' ? ' ↑' : ' ↓';
  }

  function format_duration(seconds: number): string {
    const s = Math.floor(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // All tracks as an array, preserving insertion order
  $: all_tracks = Object.values(library?.tracks ?? {}).filter((t): t is Track => t !== null);

  // Playlists and folders from track_lists (exclude special)
  $: track_lists = Object.values(library?.track_lists ?? {}).filter((tl): tl is TrackList => tl !== null);
  $: playlists = track_lists.filter((tl): tl is Playlist & { type: 'playlist' } => tl.type === 'playlist');

  // Tracks for the selected playlist, resolved from item IDs (indices into all_tracks)
  $: playlist_tracks = (() => {
    if (selected_playlist_id === null) return all_tracks;
    const playlist = playlists.find(p => p.id === selected_playlist_id);
    if (!playlist) return all_tracks;
    return playlist.tracks
      .map(item_id => all_tracks[item_id])
      .filter((t): t is Track => t !== null);
  })();

  $: genres = [...new Set(
	  all_tracks.map(t => t.genre).filter((g): g is string => g !== null)
  )].sort();

  $: filtered_tracks = playlist_tracks
    .filter(t => {
      if (active_filter.kind === 'liked') return t.liked === true;
      if (active_filter.kind === 'genre') return t.genre === active_filter.value;
      return true;
    })
    .filter(t => {
      if (!search_query) return true;
      const q = search_query.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.artist?.toLowerCase().includes(q) ?? false) ||
        (t.albumName?.toLowerCase().includes(q) ?? false)
      );
    })
    .sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sort_key === 'name')           { av = a.name;           bv = b.name; }
      else if (sort_key === 'artist')    { av = a.artist ?? '';   bv = b.artist ?? ''; }
      else if (sort_key === 'dateAdded') { av = a.dateAdded;      bv = b.dateAdded; }
      else                               { av = a.playCount ?? 0; bv = b.playCount ?? 0; }
      if (av < bv) return sort_dir === 'asc' ? -1 : 1;
      if (av > bv) return sort_dir === 'asc' ? 1 : -1;
      return 0;
    });
</script>

<div class="flex flex-col h-screen bg-neutral-950 text-neutral-200 text-sm overflow-hidden">

  <!-- Header -->
  <header class="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 shrink-0">
    <div class="relative flex-1">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none text-xs select-none">⌕</span>
      <input
        type="search"
        placeholder="Search tracks, artists, albums…"
        bind:value={search_query}
        class="w-full pl-8 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 text-sm placeholder-neutral-600 outline-none focus:border-neutral-500 transition-colors"
      />
    </div>
    <button
      type="button"
      onclick={open_library}
      disabled={loading}
      class="shrink-0 px-4 py-2 bg-neutral-100 text-neutral-900 rounded-lg font-semibold text-sm hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? 'Loading…' : 'Open'}
    </button>
  </header>

  {#if error}
    <div class="px-4 py-2.5 bg-red-950 border-b border-red-900 text-red-400 text-xs shrink-0">
      ⚠ {error}
    </div>
  {/if}

  {#if library}
    <!-- Playlists row -->
    {#if playlists.length > 0}
      <div class="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800 overflow-x-auto no-scrollbar shrink-0">
        <button
          type="button"
          onclick={() => selected_playlist_id = null}
          class="shrink-0 px-3 py-1 rounded-full text-xs border transition-colors {selected_playlist_id === null ? 'bg-neutral-200 border-neutral-200 text-neutral-900 font-semibold' : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'}"
        >
          All tracks
        </button>
        {#each playlists as playlist}
          <button
            type="button"
            onclick={() => selected_playlist_id = playlist.id}
            class="shrink-0 px-3 py-1 rounded-full text-xs border transition-colors {selected_playlist_id === playlist.id ? 'bg-neutral-200 border-neutral-200 text-neutral-900 font-semibold' : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'}"
          >
            {playlist.name}
          </button>
        {/each}
      </div>
    {/if}

    <!-- Sort + filter row -->
    <div class="shrink-0 border-b border-neutral-800">
      <div class="flex items-center gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar">
        <span class="text-xs text-neutral-600 shrink-0 mr-0.5">Sort:</span>
        <button type="button" onclick={() => toggle_sort('name')}
          class="shrink-0 px-2.5 py-1 rounded text-xs border transition-colors {sort_key === 'name' ? 'bg-neutral-700 border-neutral-600 text-neutral-100' : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'}">
          Name{sort_indicator('name')}
        </button>
        <button type="button" onclick={() => toggle_sort('artist')}
          class="shrink-0 px-2.5 py-1 rounded text-xs border transition-colors {sort_key === 'artist' ? 'bg-neutral-700 border-neutral-600 text-neutral-100' : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'}">
          Artist{sort_indicator('artist')}
        </button>
        <button type="button" onclick={() => toggle_sort('dateAdded')}
          class="shrink-0 px-2.5 py-1 rounded text-xs border transition-colors {sort_key === 'dateAdded' ? 'bg-neutral-700 border-neutral-600 text-neutral-100' : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'}">
          Date{sort_indicator('dateAdded')}
        </button>
        <button type="button" onclick={() => toggle_sort('playCount')}
          class="shrink-0 px-2.5 py-1 rounded text-xs border transition-colors {sort_key === 'playCount' ? 'bg-neutral-700 border-neutral-600 text-neutral-100' : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'}">
          Plays{sort_indicator('playCount')}
        </button>
        <span class="ml-auto shrink-0 text-xs text-neutral-600 tabular-nums pl-2">
          {filtered_tracks.length}/{playlist_tracks.length}
        </span>
      </div>

      <div class="flex items-center gap-1.5 px-4 pb-2 overflow-x-auto no-scrollbar">
        <span class="text-xs text-neutral-600 shrink-0 mr-0.5">Filter:</span>
        <button type="button" onclick={() => active_filter = { kind: 'all' }}
          class="shrink-0 px-2.5 py-1 rounded-full text-xs border transition-colors {active_filter.kind === 'all' ? 'bg-neutral-200 border-neutral-200 text-neutral-900 font-semibold' : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'}">
          All
        </button>
        <button type="button" onclick={() => active_filter = { kind: 'liked' }}
          class="shrink-0 px-2.5 py-1 rounded-full text-xs border transition-colors {active_filter.kind === 'liked' ? 'bg-rose-900 border-rose-700 text-rose-200 font-semibold' : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'}">
          ♥ Liked
        </button>
        {#each genres as genre}
          <button type="button" onclick={() => active_filter = { kind: 'genre', value: genre }}
            class="shrink-0 px-2.5 py-1 rounded-full text-xs border transition-colors {active_filter.kind === 'genre' && active_filter.value === genre ? 'bg-neutral-700 border-neutral-600 text-neutral-100 font-semibold' : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'}">
            {genre}
          </button>
        {/each}
      </div>
    </div>

    <!-- Track list -->
    <div class="flex-1 overflow-y-auto">
      {#if filtered_tracks.length > 0}
        <ul class="divide-y divide-neutral-900">
          {#each filtered_tracks as track}
            <li class="flex items-center gap-3 px-4 py-3 hover:bg-neutral-800/50 active:bg-neutral-800 transition-colors">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-neutral-100 truncate">{track.name}</p>
                <p class="text-xs text-neutral-500 truncate mt-0.5">
                  {track.artist ?? 'Unknown Artist'}
                  {#if track.albumName}
                    <span class="text-neutral-700"> · </span>{track.albumName}
                  {/if}
                </p>
                <div class="flex items-center gap-2 mt-1">
                  {#if track.genre}
                    <span class="px-1.5 py-px text-xs rounded bg-neutral-800 text-neutral-500">{track.genre}</span>
                  {/if}
                  {#if track.year}
                    <span class="text-xs text-neutral-700">{track.year}</span>
                  {/if}
                </div>
              </div>
              <div class="shrink-0 flex flex-col items-end gap-1 text-xs text-neutral-600 tabular-nums">
                <span>{format_duration(track.duration)}</span>
                {#if track.playCount}
                  <span>{track.playCount} plays</span>
                {/if}
                {#if track.liked}
                  <span class="text-rose-500">♥</span>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {:else}
        <div class="flex flex-col items-center justify-center h-full gap-3 text-neutral-700 px-8 text-center">
          <span class="text-4xl">⌕</span>
          <p class="text-xs">No tracks match your search or filter</p>
        </div>
      {/if}
    </div>

  {:else}
    <!-- Empty state -->
    <div class="flex flex-col items-center justify-center flex-1 gap-4 text-neutral-700 px-8 text-center">
      <span class="text-5xl">♪</span>
      <div>
        <p class="font-medium text-neutral-500">No library loaded</p>
        <p class="text-xs mt-1">Tap <strong class="text-neutral-400">Open</strong> to load a library JSON file</p>
      </div>
    </div>
  {/if}

</div>

<style>
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
