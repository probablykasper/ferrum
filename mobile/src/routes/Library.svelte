<script lang="ts">
	import type { Snippet } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import type { Track, TrackList, Playlist, Folder, Special, LibraryTauri } from '../../bindings'
	import { resolve } from '$app/paths'
	import { openUrl } from '@tauri-apps/plugin-opener'

	type sort_key_type = 'name' | 'artist' | 'dateAdded' | 'playCount'
	type sort_dir_type = 'asc' | 'desc'
	type active_filter_type = { kind: 'all' } | { kind: 'genre'; value: string }
	type view_type = { kind: 'browser'; folder_id: string } | { kind: 'tracks'; playlist_id: string }
	type streaming_service_type = 'spotify' | 'youtube-music'

	const { library, open_button, streaming_service } = $props<{
		library: LibraryTauri | null
		open_button: Snippet<[]>
		streaming_service: streaming_service_type
	}>()
	let error = $state('')
	let search_query = $state('')
	let sort_key = $state<sort_key_type>('dateAdded')
	let sort_dir = $state<sort_dir_type>('desc')
	let active_filter = $state<active_filter_type>({ kind: 'all' })

	// ── View derived from URL search params ────────────────────────────────────
	const view = $derived<view_type>(
		page.url.searchParams.get('view') === 'tracks'
			? { kind: 'tracks', playlist_id: page.url.searchParams.get('id') ?? 'root' }
			: { kind: 'browser', folder_id: page.url.searchParams.get('id') ?? 'root' },
	)

	// ── Helpers ────────────────────────────────────────────────────────────────

	function get_tracklist(id: string): TrackList | null {
		return library?.track_lists?.[id] ?? null
	}

	function get_special(id: string): (Special & { type: 'special' }) | null {
		const tl = get_tracklist(id)
		return tl?.type === 'special' ? tl : null
	}

	function get_folder(id: string): (Folder & { type: 'folder' }) | null {
		const tl = get_tracklist(id)
		return tl?.type === 'folder' ? tl : null
	}

	function get_playlist(id: string): (Playlist & { type: 'playlist' }) | null {
		const tl = get_tracklist(id)
		return tl?.type === 'playlist' ? tl : null
	}

	function get_children(folder_id: string): string[] {
		const special = get_special(folder_id)
		if (special) return special.children
		return get_folder(folder_id)?.children ?? []
	}

	function node_name(id: string, context?: 'browser' | 'tracks'): string {
		if (id === 'root' && context === 'tracks') return 'All Songs'
		const tl = get_tracklist(id)
		if (!tl) return 'Unknown'
		if (tl.type === 'special') return 'Library'
		return tl.name
	}

	function count_tracks_in(id: string): number {
		const tl = get_tracklist(id)
		if (!tl) return 0
		if (tl.type === 'playlist') return tl.tracks.length
		const children = tl.type === 'folder' ? tl.children : tl.type === 'special' ? tl.children : []
		return children.reduce((sum, child_id) => sum + count_tracks_in(child_id), 0)
	}

	// ── Navigation ─────────────────────────────────────────────────────────────

	function open_folder(id: string) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(resolve('/') + `?view=browser&id=${id}`)
	}

	function open_playlist(id: string) {
		search_query = ''
		active_filter = { kind: 'all' }
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(resolve('/') + `?view=tracks&id=${id}`)
	}

	// ── Derived / async data ──────────────────────────────────────────────────

	const current_children = $derived(view.kind === 'browser' ? get_children(view.folder_id) : [])

	// Playlist.tracks is typed as number[] in the bindings, but serialize_playlist_ids
	// in Rust serializes them back to track ID strings over the wire.
	const playlist_tracks = $derived.by(() => {
		if (view.kind !== 'tracks') return []
		// Fake "All Songs" playlist — aggregate every track in the library
		if (view.playlist_id === 'root') {
			return Object.values(library?.tracks ?? {}) as Track[]
		}
		const playlist = get_playlist(view.playlist_id)
		if (!playlist) {
			console.error('[Library] no playlist found for id', view.playlist_id)
			return []
		}
		const track_ids = playlist.tracks as unknown as string[]
		const resolved = track_ids
			.map((track_id) => {
				const track = library?.tracks?.[track_id]
				if (track === undefined) console.error('[Library] no track for track_id', track_id)
				return track
			})
			.filter((t): t is Track => t !== undefined)
		return resolved
	})

	const genres = $derived(
		[
			...new Set(
				playlist_tracks
					.map((t) => t.genre)
					.filter((g): g is string => g !== null && g !== undefined),
			),
		].sort(),
	)

	const filtered_tracks = $derived(
		playlist_tracks
			.filter((t) => {
				if (active_filter.kind === 'genre') return t.genre === active_filter.value
				return true
			})
			.filter((t) => {
				if (!search_query) return true
				const q = search_query.toLowerCase()
				return (
					t.name.toLowerCase().includes(q) ||
					(t.artist?.toLowerCase().includes(q) ?? false) ||
					(t.albumName?.toLowerCase().includes(q) ?? false)
				)
			})
			.sort((a, b) => {
				let av: string | number
				let bv: string | number
				if (sort_key === 'name') {
					av = a.name
					bv = b.name
				} else if (sort_key === 'artist') {
					av = a.artist ?? ''
					bv = b.artist ?? ''
				} else if (sort_key === 'dateAdded') {
					av = a.dateAdded
					bv = b.dateAdded
				} else {
					av = a.playCount ?? 0
					bv = b.playCount ?? 0
				}
				if (av < bv) return sort_dir === 'asc' ? -1 : 1
				if (av > bv) return sort_dir === 'asc' ? 1 : -1
				return 0
			}),
	)

	// ── Formatting ─────────────────────────────────────────────────────────────

	function toggle_sort(key: sort_key_type) {
		if (sort_key === key) sort_dir = sort_dir === 'asc' ? 'desc' : 'asc'
		else {
			sort_key = key
			sort_dir = 'asc'
		}
	}

	function sort_indicator(key: sort_key_type): string {
		if (sort_key !== key) return ''
		return sort_dir === 'asc' ? ' ↑' : ' ↓'
	}

	function format_duration(seconds: number): string {
		const s = Math.floor(seconds)
		return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
	}

	function open_track(track: Track) {
		const artist = track.artist?.trim() || 'Unknown Artist'
		const title = track.name.trim()
		const query = `${artist} - ${title}`
		const encoded_query = encodeURIComponent(query)
		if (streaming_service === 'youtube-music') {
			openUrl(`vnd.youtube.music://search?q=${encoded_query}`)
		} else if (streaming_service === 'spotify') {
			openUrl(`open.spotify.com/search/${encoded_query}`)
		}
	}
</script>

<div
	class="flex h-screen flex-col overflow-hidden bg-white text-sm text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
>
	<!-- Header -->
	<header
		class="flex shrink-0 items-center gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800"
	>
		{#if page.url.searchParams.has('id')}
			<button
				type="button"
				onclick={() => history.back()}
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
				aria-label="Back">‹</button
			>
		{/if}

		<div class="min-w-0 flex-1">
			{#if view.kind === 'browser'}
				<p class="truncate leading-tight font-semibold text-neutral-900 dark:text-neutral-100">
					{node_name(view.folder_id, 'browser')}
				</p>
			{:else if view.kind === 'tracks'}
				<p class="truncate leading-tight font-semibold text-neutral-900 dark:text-neutral-100">
					{node_name(view.playlist_id, 'tracks')}
				</p>
			{/if}
		</div>

		{@render open_button()}
	</header>

	{#if error}
		<div
			class="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
		>
			⚠ {error}
		</div>
	{/if}

	<!-- ── Browser view ───────────────────────────────────────────────────── -->
	{#if view.kind === 'browser'}
		<div class="flex-1 overflow-y-auto">
			{#if current_children.length > 0}
				<ul class="divide-y divide-neutral-200 dark:divide-neutral-900">
					{#if view.folder_id === 'root'}
						<li>
							<button
								type="button"
								onclick={() => open_playlist('root')}
								class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-neutral-100/50 active:bg-neutral-100 dark:hover:bg-neutral-800/50 dark:active:bg-neutral-800"
							>
								<span class="w-7 shrink-0 text-center text-neutral-500 select-none">
									<svg
										style="transform: translateX(2px)"
										xmlns="http://www.w3.org/2000/svg"
										height="24px"
										viewBox="0 0 24 24"
										width="24px"
										fill="currentColor"
										><path
											d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
										/></svg
									>
								</span>
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-neutral-900 dark:text-neutral-100">
										All Songs
									</p>
									<p class="mt-0.5 text-xs text-neutral-500">
										{Object.keys(library?.tracks ?? {}).length}
										{Object.keys(library?.tracks ?? {}).length === 1 ? 'track' : 'tracks'}
									</p>
								</div>
								<span class="text-lg text-neutral-400 select-none dark:text-neutral-700">›</span>
							</button>
						</li>
					{/if}
					{#each current_children as child_id}
						{@const tl = get_tracklist(child_id)}
						{#if tl?.type === 'folder'}
							<li>
								<button
									type="button"
									onclick={() => open_folder(child_id)}
									class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-neutral-100/50 active:bg-neutral-100 dark:hover:bg-neutral-800/50 dark:active:bg-neutral-800"
								>
									<span class="w-7 shrink-0 text-center text-neutral-500 select-none">
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
									<div class="min-w-0 flex-1">
										<p class="truncate font-medium text-neutral-900 dark:text-neutral-100">
											{tl.name}
										</p>
										<p class="mt-0.5 text-xs text-neutral-500">
											{tl.children.length}
											{tl.children.length === 1 ? 'item' : 'items'} · {count_tracks_in(child_id)} tracks
										</p>
									</div>
									<span class="text-lg text-neutral-400 select-none dark:text-neutral-700">›</span>
								</button>
							</li>
						{:else if tl?.type === 'playlist'}
							<li>
								<button
									type="button"
									onclick={() => open_playlist(child_id)}
									class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-neutral-100/50 active:bg-neutral-100 dark:hover:bg-neutral-800/50 dark:active:bg-neutral-800"
								>
									<span class="w-7 shrink-0 text-center text-neutral-500 select-none">
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
									<div class="min-w-0 flex-1">
										<p class="truncate font-medium text-neutral-900 dark:text-neutral-100">
											{tl.name}
										</p>
										<p class="mt-0.5 text-xs text-neutral-500">
											{tl.tracks.length}
											{tl.tracks.length === 1 ? 'track' : 'tracks'}
										</p>
									</div>
									<span class="text-lg text-neutral-400 select-none dark:text-neutral-700">›</span>
								</button>
							</li>
						{/if}
					{/each}
				</ul>
			{:else}
				<div
					class="flex h-32 items-center justify-center text-xs text-neutral-400 dark:text-neutral-700"
				>
					This folder is empty
				</div>
			{/if}
		</div>

		<!-- ── Tracks view ────────────────────────────────────────────────────── -->
	{:else if view.kind === 'tracks'}
		<div class="shrink-0 border-b border-neutral-200 dark:border-neutral-800">
			<div class="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-4 py-2">
				<div class="relative shrink-0">
					<span
						class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-neutral-500 select-none"
						>⌕</span
					>
					<input
						type="search"
						placeholder="Search…"
						bind:value={search_query}
						class="w-32 rounded-lg border border-neutral-300 bg-neutral-100 py-1.5 pr-3 pl-7 text-xs text-neutral-800 placeholder-neutral-400 transition-colors outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder-neutral-600 dark:focus:border-neutral-500"
					/>
				</div>
				<div class="mx-0.5 h-4 w-px shrink-0 bg-neutral-100 dark:bg-neutral-800"></div>
				<button
					type="button"
					onclick={() => toggle_sort('name')}
					class="shrink-0 rounded border px-2.5 py-1 text-xs transition-colors {sort_key === 'name'
						? 'border-neutral-400 bg-neutral-200 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100'
						: 'border-neutral-300 text-neutral-500 hover:text-neutral-600 dark:border-neutral-700 dark:hover:text-neutral-300'}"
				>
					Name{sort_indicator('name')}
				</button>
				<button
					type="button"
					onclick={() => toggle_sort('artist')}
					class="shrink-0 rounded border px-2.5 py-1 text-xs transition-colors {sort_key ===
					'artist'
						? 'border-neutral-400 bg-neutral-200 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100'
						: 'border-neutral-300 text-neutral-500 hover:text-neutral-600 dark:border-neutral-700 dark:hover:text-neutral-300'}"
				>
					Artist{sort_indicator('artist')}
				</button>
				<button
					type="button"
					onclick={() => toggle_sort('dateAdded')}
					class="shrink-0 rounded border px-2.5 py-1 text-xs transition-colors {sort_key ===
					'dateAdded'
						? 'border-neutral-400 bg-neutral-200 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100'
						: 'border-neutral-300 text-neutral-500 hover:text-neutral-600 dark:border-neutral-700 dark:hover:text-neutral-300'}"
				>
					Date{sort_indicator('dateAdded')}
				</button>
				<button
					type="button"
					onclick={() => toggle_sort('playCount')}
					class="shrink-0 rounded border px-2.5 py-1 text-xs transition-colors {sort_key ===
					'playCount'
						? 'border-neutral-400 bg-neutral-200 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100'
						: 'border-neutral-300 text-neutral-500 hover:text-neutral-600 dark:border-neutral-700 dark:hover:text-neutral-300'}"
				>
					Plays{sort_indicator('playCount')}
				</button>
				<span
					class="ml-auto shrink-0 pl-1 text-xs text-neutral-400 tabular-nums dark:text-neutral-600"
				>
					{filtered_tracks.length}/{playlist_tracks.length}
				</span>
			</div>

			<div class="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-4 pb-2">
				<button
					type="button"
					onclick={() => (active_filter = { kind: 'all' })}
					class="shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors {active_filter.kind ===
					'all'
						? 'border-neutral-200 bg-neutral-200 font-semibold text-neutral-900'
						: 'border-neutral-300 text-neutral-500 hover:text-neutral-600 dark:border-neutral-700 dark:hover:text-neutral-300'}"
				>
					All
				</button>
				{#each genres as genre}
					<button
						type="button"
						onclick={() => (active_filter = { kind: 'genre', value: genre })}
						class="shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors {active_filter.kind ===
							'genre' && active_filter.value === genre
							? 'border-neutral-400 bg-neutral-200 font-semibold text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100'
							: 'border-neutral-300 text-neutral-500 hover:text-neutral-600 dark:border-neutral-700 dark:hover:text-neutral-300'}"
					>
						{genre}
					</button>
				{/each}
			</div>
		</div>

		<div class="flex-1 overflow-y-auto">
			{#if filtered_tracks.length > 0}
				<ul class="divide-y divide-neutral-200 dark:divide-neutral-900">
					{#each filtered_tracks as track}
						<li>
							<button
								type="button"
								class="focus-visible active flex w-full items-center justify-between gap-3 px-4 py-3 focus-visible:bg-neutral-100"
								onclick={() => open_track(track)}
							>
								<div class="grow text-left">
									<p class="truncate font-medium text-neutral-900 dark:text-neutral-100">
										{track.name}
									</p>
									<p class="mt-0.5 truncate text-xs text-neutral-500">
										{track.artist ?? 'Unknown Artist'}
										{#if track.albumName}
											<span class="text-neutral-400 dark:text-neutral-700">
												·
											</span>{track.albumName}
										{/if}
									</p>
									<div class="mt-1 flex items-center gap-2">
										{#if track.genre}
											<span
												class="rounded bg-neutral-100 px-1.5 py-px text-xs text-neutral-500 dark:bg-neutral-800"
												>{track.genre}</span
											>
										{/if}
										{#if track.year}
											<span class="text-xs text-neutral-400 dark:text-neutral-700"
												>{track.year}</span
											>
										{/if}
									</div>
								</div>
								<div
									class="flex shrink-0 flex-col items-end gap-1 text-xs text-neutral-400 tabular-nums dark:text-neutral-600"
								>
									<span>{format_duration(track.duration)}</span>
									{#if track.playCount}
										<span>{track.playCount} plays</span>
									{/if}
								</div>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<div
					class="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-neutral-400 dark:text-neutral-700"
				>
					<span class="text-4xl">⌕</span>
					<p class="text-xs">No tracks match your search or filter</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
