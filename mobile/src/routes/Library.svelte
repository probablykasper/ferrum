<script lang="ts">
	import type { Snippet } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import type { Track, TrackList, Playlist, Folder, Special, LibraryTauri } from '../../bindings'
	import { resolve } from '$app/paths'

  type sort_key_type = 'name' | 'artist' | 'dateAdded' | 'playCount';
  type sort_dir_type = 'asc' | 'desc';
  type active_filter_type = { kind: 'all' } | { kind: 'liked' } | { kind: 'genre'; value: string };
  type view_type =
    | { kind: 'browser'; folder_id: string }
    | { kind: 'tracks'; playlist_id: string };

  const {
  	library,
  	open_button,
  } = $props<{
  	library: LibraryTauri | null,
		open_button: Snippet<[]>,
	}>();
  let error = $state('');
  let search_query = $state('');
  let sort_key = $state<sort_key_type>('name');
  let sort_dir = $state<sort_dir_type>('asc');
  let active_filter = $state<active_filter_type>({ kind: 'all' });

  // ── View derived from URL search params ────────────────────────────────────
  const view = $derived<view_type>(
    page.url.searchParams.get('view') === 'tracks'
      ? { kind: 'tracks', playlist_id: page.url.searchParams.get('id') ?? 'root' }
      : { kind: 'browser', folder_id: page.url.searchParams.get('id') ?? 'root' }
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  function get_tracklist(id: string): TrackList | null {
    return library?.track_lists?.[id] ?? null;
  }

  function get_special(id: string): (Special & { type: 'special' }) | null {
    const tl = get_tracklist(id);
    return tl?.type === 'special' ? tl : null;
  }

  function get_folder(id: string): (Folder & { type: 'folder' }) | null {
    const tl = get_tracklist(id);
    return tl?.type === 'folder' ? tl : null;
  }

  function get_playlist(id: string): (Playlist & { type: 'playlist' }) | null {
    const tl = get_tracklist(id);
    return tl?.type === 'playlist' ? tl : null;
  }

  function get_children(folder_id: string): string[] {
    const special = get_special(folder_id);
    if (special) return special.children;
    return get_folder(folder_id)?.children ?? [];
  }

  function node_name(id: string): string {
    const tl = get_tracklist(id);
    if (!tl) return 'Unknown';
    if (tl.type === 'special') return 'Library';
    return tl.name;
  }

  function count_tracks_in(id: string): number {
    const tl = get_tracklist(id);
    if (!tl) return 0;
    if (tl.type === 'playlist') return tl.tracks.length;
    const children = tl.type === 'folder' ? tl.children : tl.type === 'special' ? tl.children : [];
    return children.reduce((sum, child_id) => sum + count_tracks_in(child_id), 0);
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function open_folder(id: string) {
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(resolve('/') + `?view=browser&id=${id}`);
  }

  function open_playlist(id: string) {
    search_query = '';
    active_filter = { kind: 'all' };
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(resolve('/') + `?view=tracks&id=${id}`);
  }

  // ── Derived / async data ──────────────────────────────────────────────────

  const current_children = $derived(
    view.kind === 'browser' ? get_children(view.folder_id) : []
  );

  // Playlist.tracks is typed as number[] in the bindings, but serialize_playlist_ids
  // in Rust serializes them back to track ID strings over the wire.
  const playlist_tracks = $derived.by(() => {
    if (view.kind !== 'tracks') return [];
    const playlist = get_playlist(view.playlist_id);
    if (!playlist) {
      console.error('[Library] no playlist found for id', view.playlist_id);
      return [];
    }
    const track_ids = playlist.tracks as unknown as string[];
    const resolved = track_ids.map(track_id => {
      const track = library?.tracks?.[track_id];
      if (track === undefined) console.error('[Library] no track for track_id', track_id);
      return track;
    }).filter((t): t is Track => t !== undefined);
    return resolved;
  });

  const genres = $derived(
    [...new Set(playlist_tracks.map(t => t.genre).filter((g): g is string => g !== null && g !== undefined))].sort()
  );

  const filtered_tracks = $derived(
    playlist_tracks
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
      })
  );

  // ── Formatting ─────────────────────────────────────────────────────────────

  function toggle_sort(key: sort_key_type) {
    if (sort_key === key) sort_dir = sort_dir === 'asc' ? 'desc' : 'asc';
    else { sort_key = key; sort_dir = 'asc'; }
  }

  function sort_indicator(key: sort_key_type): string {
    if (sort_key !== key) return '';
    return sort_dir === 'asc' ? ' ↑' : ' ↓';
  }

  function format_duration(seconds: number): string {
    const s = Math.floor(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
</script>

<div class="flex flex-col h-screen bg-neutral-950 text-neutral-200 text-sm overflow-hidden">

  <!-- Header -->
  <header class="flex items-center gap-2 px-4 py-3 border-b border-neutral-800 shrink-0">
    {#if page.url.searchParams.has('id')}
      <button
        type="button"
        onclick={() => history.back()}
        class="shrink-0 flex items-center justify-center w-8 h-8 text-xl rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
        aria-label="Back"
      >‹</button>
    {/if}

    <div class="flex-1 min-w-0">
      {#if view.kind === 'browser'}
        <p class="font-semibold text-neutral-100 truncate leading-tight">{node_name(view.folder_id)}</p>
      {:else if view.kind === 'tracks'}
        <p class="font-semibold text-neutral-100 truncate leading-tight">{node_name(view.playlist_id)}</p>
      {/if}

    </div>

    {@render open_button()}
  </header>

  {#if error}
    <div class="px-4 py-2.5 bg-red-950 border-b border-red-900 text-red-400 text-xs shrink-0">⚠ {error}</div>
  {/if}

  <!-- ── Browser view ───────────────────────────────────────────────────── -->
  {#if view.kind === 'browser'}
    <div class="flex-1 overflow-y-auto">
      {#if current_children.length > 0}
        <ul class="divide-y divide-neutral-900">
          {#each current_children as child_id}
            {@const tl = get_tracklist(child_id)}
            {#if tl?.type === 'folder'}
              <li>
                <button
                  type="button"
                  onclick={() => open_folder(child_id)}
                  class="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-800/50 active:bg-neutral-800 transition-colors text-left"
                >
                  <span class="shrink-0 w-7 text-center text-neutral-500 select-none">
                  <svg
										style="padding: 1px"
										xmlns="http://www.w3.org/2000/svg"
										height="22px"
										viewBox="0 0 24 24"
										width="22px"
										fill="currentColor"
										><path d="M0 0h24v24H0V0z" fill="none" /><path
											d="M9.17 6l2 2H20v10H4V6h5.17M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
										/></svg
									>
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-neutral-100 truncate">{tl.name}</p>
                    <p class="text-xs text-neutral-500 mt-0.5">
                      {tl.children.length} {tl.children.length === 1 ? 'item' : 'items'} · {count_tracks_in(child_id)} tracks
                    </p>
                  </div>
                  <span class="text-neutral-700 text-lg select-none">›</span>
                </button>
              </li>
            {:else if tl?.type === 'playlist'}
              <li>
                <button
                  type="button"
                  onclick={() => open_playlist(child_id)}
                  class="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-800/50 active:bg-neutral-800 transition-colors text-left"
                >
                  <span class="shrink-0 w-7 text-center text-neutral-500 select-none">
                 	<svg
										style="transform: translateX(2px)"
										xmlns="http://www.w3.org/2000/svg"
										height="24px"
										viewBox="0 0 24 24"
										width="24px"
										fill="currentColor"
										><path
											d="M5 10h10c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm0-4h10c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm0 8h6c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1s.45-1 1-1zm9 .88v4.23c0 .39.42.63.76.43l3.53-2.12c.32-.19.32-.66 0-.86l-3.53-2.12c-.34-.19-.76.05-.76.44z"
										/></svg
									>
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-neutral-100 truncate">{tl.name}</p>
                    <p class="text-xs text-neutral-500 mt-0.5">
                      {tl.tracks.length} {tl.tracks.length === 1 ? 'track' : 'tracks'}{tl.liked ? ' · ♥' : ''}
                    </p>
                  </div>
                  <span class="text-neutral-700 text-lg select-none">›</span>
                </button>
              </li>
            {/if}
          {/each}
        </ul>
      {:else}
        <div class="flex items-center justify-center h-32 text-neutral-700 text-xs">This folder is empty</div>
      {/if}
    </div>

  <!-- ── Tracks view ────────────────────────────────────────────────────── -->
  {:else if view.kind === 'tracks'}
    <div class="shrink-0 border-b border-neutral-800">
      <div class="flex items-center gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar">
        <div class="relative shrink-0">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none text-xs select-none">⌕</span>
          <input
            type="search"
            placeholder="Search…"
            bind:value={search_query}
            class="pl-7 pr-3 py-1.5 w-32 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 text-xs placeholder-neutral-600 outline-none focus:border-neutral-500 transition-colors"
          />
        </div>
        <div class="w-px h-4 bg-neutral-800 shrink-0 mx-0.5"></div>
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
        <span class="ml-auto shrink-0 text-xs text-neutral-600 tabular-nums pl-1">
          {filtered_tracks.length}/{playlist_tracks.length}
        </span>
      </div>

      <div class="flex items-center gap-1.5 px-4 pb-2 overflow-x-auto no-scrollbar">
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

    <div class="flex-1 overflow-y-auto">
      {#if filtered_tracks.length > 0}
        <ul class="divide-y divide-neutral-900">
          {#each filtered_tracks as track}
            <li class="flex items-center gap-3 px-4 py-3 transition-colors">
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
  {/if}

</div>

<style>
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
