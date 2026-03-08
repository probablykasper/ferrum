<script lang="ts">
	import { fly } from 'svelte/transition'

	type LrcLine = {
		time_sec: number
		text: string
	}

	type LrclibApiTrack = {
		plainLyrics?: string | null
		syncedLyrics?: string | null
		instrumental?: boolean
	}

	type LrclibTrack = {
		plain_lyrics: string | null
		synced_lyrics: string | null
		instrumental: boolean
	}

	type Props = {
		track_name?: string
		artist_name?: string
		album_name?: string
		duration_sec?: number | null
		current_time_sec?: number
	}

	const cache_by_key: Record<string, LrclibTrack | null> = {}

	let {
		track_name = '',
		artist_name = '',
		album_name = '',
		duration_sec = null,
		current_time_sec = 0,
	}: Props = $props()

	let loading = $state(false)
	let error_message = $state('')
	let lyrics_data = $state<LrclibTrack | null>(null)
	let request_key = $state('')

	const query_key = $derived(make_key(track_name, artist_name, album_name, duration_sec))
	const synced_lines = $derived(parse_synced_lyrics(lyrics_data?.synced_lyrics ?? ''))
	const active_line_index = $derived(find_active_line_index(synced_lines, current_time_sec))
	const plain_lines = $derived(
		(lyrics_data?.plain_lyrics ?? '')
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean),
	)

	$effect(() => {
		const key = query_key
		if (!key) {
			lyrics_data = null
			error_message = ''
			loading = false
			return
		}
		void load_lyrics(key, {
			track_name,
			artist_name,
			album_name,
			duration_sec,
		})
	})

	function normalize(value: string) {
		return value.trim().toLowerCase()
	}

	function make_key(track: string, artist: string, album: string, dur: number | null) {
		const t = normalize(track)
		const a = normalize(artist)
		if (!t || !a) return ''
		const alb = normalize(album)
		const d = typeof dur === 'number' && Number.isFinite(dur) ? Math.round(dur) : 0
		return `${a}|${t}|${alb}|${d}`
	}

	function encode_query(params: Record<string, string | number | undefined>) {
		const parts: string[] = []
		for (const [key, value] of Object.entries(params)) {
			if (value === undefined) continue
			parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
		}
		return parts.join('&')
	}

	async function get_json(url: string) {
		const res = await fetch(url)
		if (res.status === 404) return null
		if (!res.ok) throw new Error(`LRCLIB request failed (${res.status})`)
		return await res.json()
	}

	function normalize_track(raw: LrclibApiTrack): LrclibTrack {
		return {
			plain_lyrics: raw.plainLyrics ?? null,
			synced_lyrics: raw.syncedLyrics ?? null,
			instrumental: Boolean(raw.instrumental),
		}
	}

	async function load_lyrics(next_key: string, params: Omit<Props, 'current_time_sec'>) {
		request_key = next_key
		error_message = ''
		loading = true

		if (Object.prototype.hasOwnProperty.call(cache_by_key, next_key)) {
			lyrics_data = cache_by_key[next_key] ?? null
			loading = false
			return
		}

		try {
			const get_query = encode_query({
				track_name: params.track_name?.trim() || '',
				artist_name: params.artist_name?.trim() || '',
				album_name: params.album_name?.trim() || undefined,
				duration:
					typeof params.duration_sec === 'number' &&
					Number.isFinite(params.duration_sec) &&
					params.duration_sec > 0
						? Math.round(params.duration_sec)
						: undefined,
			})
			const exact_raw = (await get_json(
				`https://lrclib.net/api/get?${get_query}`,
			)) as LrclibApiTrack | null
			if (request_key !== next_key) return
			const exact = exact_raw ? normalize_track(exact_raw) : null

			if (exact) {
				cache_by_key[next_key] = exact
				lyrics_data = exact
				return
			}

			const search_query = encode_query({
				track_name: params.track_name?.trim() || '',
				artist_name: params.artist_name?.trim() || '',
			})
			const found_raw = (await get_json(`https://lrclib.net/api/search?${search_query}`)) as
				| LrclibApiTrack[]
				| null

			if (request_key !== next_key) return
			const found = found_raw?.map(normalize_track) ?? []
			const best = found.find((item) => item.synced_lyrics || item.plain_lyrics) ?? null
			cache_by_key[next_key] = best
			lyrics_data = best
		} catch (err) {
			if (request_key !== next_key) return
			error_message = err instanceof Error ? err.message : 'Failed to load lyrics'
			lyrics_data = null
		} finally {
			if (request_key === next_key) loading = false
		}
	}

	function parse_synced_lyrics(input: string): LrcLine[] {
		if (!input) return []
		const lines: LrcLine[] = []
		for (const row of input.split('\n')) {
			const text = row.replace(/\[[^\]]+\]/g, '').trim()
			const stamps = [...row.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)]
			for (const stamp of stamps) {
				const min = Number(stamp[1] || 0)
				const sec = Number(stamp[2] || 0)
				const frac_raw = stamp[3] || ''
				const frac_ms = frac_raw ? Number(frac_raw.padEnd(3, '0').slice(0, 3)) : 0
				const total_sec = min * 60 + sec + frac_ms / 1000
				if (Number.isFinite(total_sec)) {
					lines.push({ time_sec: total_sec, text })
				}
			}
		}
		return lines.sort((a, b) => a.time_sec - b.time_sec)
	}

	function find_active_line_index(lines: LrcLine[], time_sec: number) {
		if (!lines.length || !Number.isFinite(time_sec)) return -1
		let lo = 0
		let hi = lines.length - 1
		let answer = -1
		while (lo <= hi) {
			const mid = (lo + hi) >> 1
			if (lines[mid].time_sec <= time_sec) {
				answer = mid
				lo = mid + 1
			} else {
				hi = mid - 1
			}
		}
		return answer
	}
</script>

<aside
	class="pointer-events-none absolute right-0 box-border flex h-full overflow-hidden"
	transition:fly={{ x: '100%', duration: 150, opacity: 1 }}
>
	<div class="h-full w-5 shadow-[inset_-20px_0_20px_-20px_#000000]"></div>
	<div
		class="pointer-events-auto relative -mt-px flex w-[var(--right-sidebar-width)] flex-col border-l border-[var(--border-color)] bg-black"
	>
		<div class="sticky top-0 z-10 border-b border-white/10 bg-black/75 px-4 py-3 backdrop-blur-md">
			<h3 class="m-0 text-base font-semibold">Lyrics</h3>
			{#if artist_name && track_name}
				<div class="mt-1 truncate text-xs text-white/70">{artist_name} - {track_name}</div>
			{/if}
		</div>

		<div class="flex-1 overflow-y-auto px-4 py-3">
			{#if !query_key}
				<p class="m-0 text-sm text-white/70">Play a track to load lyrics.</p>
			{:else if loading}
				<p class="m-0 text-sm text-white/70">Loading lyrics...</p>
			{:else if error_message}
				<p class="m-0 text-sm text-white/70">{error_message}</p>
			{:else if lyrics_data?.instrumental}
				<p class="m-0 text-sm text-white/70">Instrumental track.</p>
			{:else if synced_lines.length > 0}
				<div class="space-y-1">
					{#each synced_lines as line, i}
						<p
							class={`m-0 py-1 text-[15px] leading-6 transition-colors duration-100 ${
								i === active_line_index ? 'font-medium text-white' : 'text-white/60'
							}`}
						>
							{line.text || '♪'}
						</p>
					{/each}
				</div>
			{:else if plain_lines.length > 0}
				<div class="space-y-1">
					{#each plain_lines as line}
						<p class="m-0 py-1 text-[15px] leading-6 text-white/80">{line}</p>
					{/each}
				</div>
			{:else}
				<p class="m-0 text-sm text-white/70">No lyrics found.</p>
			{/if}
		</div>
	</div>
</aside>
