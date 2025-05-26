<script lang="ts" module>
	export type TrackInfoList = {
		ids: TrackID[]
		index: number
	}

	export const current_list = writable<TrackInfoList | null>(null)

	export function open_track_info(ids: TrackID[], index: number) {
		if (get(modal_count) === 0) {
			current_list.set({ ids, index })
		}
	}

	ipc_listen('context.Get Info', (_, ids: TrackID[], track_index: number) => {
		open_track_info(ids, track_index)
	})
</script>

<script lang="ts">
	import { run, self } from 'svelte/legacy';

	import { check_shortcut } from '@/lib/helpers'
	import Button from './Button.svelte'
	import type { Track, TrackID } from '../../ferrum-addon'
	import { ipc_listen, ipc_renderer } from '@/lib/window'
	import { playing_id, reload } from '@/lib/player'
	import { onDestroy, tick } from 'svelte'
	import { get, writable } from 'svelte/store'
	import Modal, { modal_count } from './Modal.svelte'
	import {
		get_image,
		get_track,
		load_tags,
		remove_image,
		set_image,
		set_image_data,
		update_track_info,
	} from '@/lib/data'

	function cancel() {
		current_list.set(null)
	}
	let id: TrackID
	let track: Track = $state()
	type ImageStuff = {
		index: number
		totalImages: number
		mimeType: string
		objectUrl: string
	}
	/** Undefined when loading, null when no image exists */
	let image: ImageStuff | null | undefined = $state()

	function open_index(list: TrackInfoList) {
		id = list.ids[list.index]
		track = get_track(list.ids[list.index])
		load_tags(list.ids[list.index])
		load_image(0)
	}
	async function load_image(index: number) {
		if (image) {
			URL.revokeObjectURL(image.objectUrl)
		}
		image = undefined
		await tick()
		const image_info = get_image(index)

		if (image_info === null) {
			image = null
		} else {
			image = {
				index: image_info.index,
				totalImages: image_info.totalImages,
				mimeType: image_info.mimeType,
				objectUrl: URL.createObjectURL(new Blob([image_info.data], {})),
			}
		}
	}
	onDestroy(() => {
		if (image && typeof image === 'object') {
			URL.revokeObjectURL(image.objectUrl)
		}
	})

	function open_prev() {
		if ($current_list && $current_list.index > 0) {
			$current_list.index -= 1
		}
	}
	function open_next() {
		if ($current_list && $current_list.index + 1 < $current_list.ids.length) {
			$current_list.index += 1
		}
	}

	function uint_filter(value: string) {
		return value.replace(/[^0-9]*/g, '')
	}
	function to_string(value: unknown) {
		return String(value).replace(/\0/g, '') // remove NULL bytes
	}

	let image_edited = false
	let name = $state('')
	let artist = $state('')
	let album_name = $state('')
	let album_artist = $state('')
	let composer = $state('')
	let grouping = $state('')
	let genre = $state('')
	let year = $state('')
	let track_num = $state('')
	let track_count = $state('')
	let disc_num = $state('')
	let disc_count = $state('')
	let bpm = $state('')
	let compilation = $state(false)
	let rating = $state(0)
	let liked = $state(false)
	let play_count = $state(0)
	let comments = $state('')
	function set_info(track: Track) {
		image_edited = false
		name = track.name
		artist = track.artist
		album_name = track.albumName || ''
		album_artist = track.albumArtist || ''
		composer = track.composer || ''
		grouping = track.grouping || ''
		genre = track.genre || ''
		year = to_string(track.year || '')
		track_num = to_string(track.trackNum || '')
		track_count = to_string(track.trackCount || '')
		disc_num = to_string(track.discNum || '')
		disc_count = to_string(track.discCount || '')
		bpm = to_string(track.bpm || '')
		compilation = track.compilation || false
		rating = track.rating || 0
		liked = track.liked || false
		play_count = track.playCount || 0
		comments = to_string(track.comments || '')
	}

	function is_edited() {
		const is_unedited =
			!image_edited &&
			name === track.name &&
			artist === track.artist &&
			album_name === (track.albumName || '') &&
			album_artist === (track.albumArtist || '') &&
			composer === (track.composer || '') &&
			grouping === (track.grouping || '') &&
			genre === (track.genre || '') &&
			year === to_string(track.year || '') &&
			track_num === to_string(track.trackNum || '') &&
			track_count === to_string(track.trackCount || '') &&
			disc_num === to_string(track.discNum || '') &&
			disc_count === to_string(track.discCount || '') &&
			bpm === to_string(track.bpm || '') &&
			compilation === (track.compilation || false) &&
			rating === (track.rating || 0) &&
			liked === (track.liked || false) &&
			play_count === (track.playCount || 0) &&
			comments === to_string(track.comments || '')
		return !is_unedited
	}
	function save(hide_after = true) {
		if (is_edited()) {
			update_track_info(id, {
				name,
				artist,
				albumName: album_name,
				albumArtist: album_artist,
				composer,
				grouping,
				genre,
				year,
				trackNum: track_num,
				trackCount: track_count,
				discNum: disc_num,
				discCount: disc_count,
				bpm,
				// compilation,
				// rating,
				// liked,
				// playCount,
				comments,
			})
			if (id === $playing_id) {
				reload()
			}
		}
		if (hide_after) {
			cancel()
		}
	}
	function big(v: string) {
		return v.length >= 3
	}
	function keydown(e: KeyboardEvent) {
		if (check_shortcut(e, '[', { cmd_or_ctrl: true })) {
			save(false)
			open_prev()
			e.preventDefault()
		} else if (check_shortcut(e, ']', { cmd_or_ctrl: true })) {
			save(false)
			open_next()
			e.preventDefault()
		}
	}
	function keydown_none_selected(e: KeyboardEvent) {
		if (check_shortcut(e, 'Enter')) {
			save()
		}
	}

	function prev_image() {
		if (image && image.index >= 1) {
			load_image(image.index - 1)
		}
	}
	function next_image() {
		if (image && image.index < image.totalImages - 1) {
			load_image(image.index + 1)
		}
	}

	let droppable = $state(false)
	const allowed_mimes = ['image/jpeg', 'image/png']
	function get_file_path(e: DragEvent): string | null {
		if (e.dataTransfer && has_file(e)) {
			for (let i = 0; i < e.dataTransfer.files.length; i++) {
				const file = e.dataTransfer.files[i]
				if (allowed_mimes.includes(file.type)) {
					return file.path
				}
			}
		}
		return null
	}
	function has_file(e: DragEvent): boolean {
		if (!e.dataTransfer) return false
		let count = 0
		for (let i = 0; i < e.dataTransfer.items.length; i++) {
			const item = e.dataTransfer.items[i]
			if (item.kind === 'file' && allowed_mimes.includes(item.type)) {
				count++
			}
		}
		return count === 1
	}
	function drag_enter_or_over(e: DragEvent) {
		e.preventDefault()
		droppable = has_file(e)
	}
	function drag_leave(e: DragEvent) {
		e.preventDefault()
		droppable = false
	}
	function drop(e: DragEvent) {
		e.preventDefault()
		droppable = false
		const path = get_file_path(e)
		if (path !== null) {
			set_image(image?.index || 0, path)
			image_edited = true
			load_image(image?.index || 0)
		}
	}
	function cover_keydown(e: KeyboardEvent) {
		if (check_shortcut(e, 'Backspace') && image) {
			remove_image(image.index)
			image_edited = true
			if (image.index < image.totalImages - 1) {
				load_image(image.index)
			} else {
				load_image(Math.max(0, image.index - 1))
			}
		} else if (check_shortcut(e, ' ')) {
			pick_cover()
		} else if (check_shortcut(e, 'ArrowLeft')) {
			prev_image()
		} else if (check_shortcut(e, 'ArrowRight')) {
			next_image()
		} else {
			keydown_none_selected(e)
		}
	}
	async function pick_cover() {
		let result = await ipc_renderer.invoke('showOpenDialog', false, {
			properties: ['openFile'],
			filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
		})
		if (!result.canceled && result.filePaths.length === 1) {
			replace_cover(result.filePaths[0])
		}
	}
	function replace_cover(file_path: string) {
		set_image(image?.index || 0, file_path)
		image_edited = true
		load_image(image?.index || 0)
	}
	function replace_cover_data(data: ArrayBuffer) {
		set_image_data(image?.index || 0, data)
		image_edited = true
		load_image(image?.index || 0)
	}
	function cover_paste(e: ClipboardEvent) {
		if (e.clipboardData && e.clipboardData.files.length === 1) {
			const file = e.clipboardData.files[0]
			if (allowed_mimes.includes(file.type) && file.path !== '' && file.path) {
				replace_cover(file.path)
			} else if (allowed_mimes.includes(file.type)) {
				const reader = new FileReader()
				reader.onload = (e) => {
					if (e.target?.result && e.target.result instanceof ArrayBuffer) {
						replace_cover_data(e.target.result)
					}
				}
				reader.readAsArrayBuffer(file)
			}
		}
	}
	run(() => {
		if ($current_list) open_index($current_list)
	});
	run(() => {
		year = uint_filter(year)
	});
	run(() => {
		if (track) set_info(track)
	});
</script>

<svelte:window onkeydown={keydown} />
<svelte:body onkeydown={self(keydown_none_selected)} onpaste={cover_paste} />
<Modal on_cancel={cancel} cancel_on_escape form={save}>
	<main class="modal">
		<div class="header" class:has-subtitle={image && image.totalImages >= 2}>
			<div
				class="cover-area"
				class:droppable
				tabindex="0"
				onkeydown={cover_keydown}
				role="button"
				aria-label="Cover artwork"
			>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="cover"
					ondragenter={drag_enter_or_over}
					ondragover={drag_enter_or_over}
					ondragleave={drag_leave}
					ondrop={drop}
					ondblclick={pick_cover}
				>
					{#if image}
						<img class="outline-element" alt="" src={image.objectUrl} />
					{:else if image === null}
						<svg
							class="cover-svg outline-element"
							xmlns="http://www.w3.org/2000/svg"
							width="8"
							height="8"
							viewBox="0 0 24 24"
						>
							<path
								d="M23 0l-15.996 3.585v13.04c-2.979-.589-6.004 1.671-6.004 4.154 0 2.137 1.671 3.221 3.485 3.221 2.155 0 4.512-1.528 4.515-4.638v-10.9l12-2.459v8.624c-2.975-.587-6 1.664-6 4.141 0 2.143 1.715 3.232 3.521 3.232 2.14 0 4.476-1.526 4.479-4.636v-17.364z"
							/>
						</svg>
					{:else}
						<!-- empty when loading -->
					{/if}
				</div>
				{#if image && image.totalImages >= 2}
					{@const image_index = image.index}
					<div class="cover-subtitle">
						<div class="arrow" class:unclickable={image_index <= 0}>
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<svg
								onclick={prev_image}
								tabindex="-1"
								role="button"
								aria-label="Previous image"
								clip-rule="evenodd"
								fill-rule="evenodd"
								stroke-linejoin="round"
								stroke-miterlimit="2"
								width="18"
								height="18"
								fill="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
								><path
									d="m13.789 7.155c.141-.108.3-.157.456-.157.389 0 .755.306.755.749v8.501c0 .445-.367.75-.755.75-.157 0-.316-.05-.457-.159-1.554-1.203-4.199-3.252-5.498-4.258-.184-.142-.29-.36-.29-.592 0-.23.107-.449.291-.591 1.299-1.002 3.945-3.044 5.498-4.243z"
								/></svg
							>
						</div>
						<div class="subtitle-text">
							{image.index + 1} / {image.totalImages}
						</div>
						<div class="arrow" class:unclickable={image_index >= image.totalImages - 1}>
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<svg
								onclick={next_image}
								tabindex="-1"
								role="button"
								aria-label="Next image"
								clip-rule="evenodd"
								fill-rule="evenodd"
								stroke-linejoin="round"
								stroke-miterlimit="2"
								width="18"
								height="18"
								fill="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
								><path
									d="m10.211 7.155c-.141-.108-.3-.157-.456-.157-.389 0-.755.306-.755.749v8.501c0 .445.367.75.755.75.157 0 .316-.05.457-.159 1.554-1.203 4.199-3.252 5.498-4.258.184-.142.29-.36.29-.592 0-.23-.107-.449-.291-.591-1.299-1.002-3.945-3.044-5.498-4.243z"
								/></svg
							>
						</div>
					</div>
				{/if}
			</div>
			<div class="text">
				<div class="name">{name}</div>
				<div class="artist">{artist}</div>
			</div>
		</div>
		<div class="spacer"></div>
		<div class="row">
			<div class="label">Title</div>
			<!-- svelte-ignore a11y_autofocus -->
			<input type="text" bind:value={name} autofocus />
		</div>
		<div class="row">
			<div class="label">Artist</div>
			<input type="text" bind:value={artist} />
		</div>
		<div class="row">
			<div class="label">Album</div>
			<input type="text" bind:value={album_name} />
		</div>
		<div class="row">
			<div class="label">Album artist</div>
			<input type="text" bind:value={album_artist} />
		</div>
		<div class="row">
			<div class="label">Composer</div>
			<input type="text" bind:value={composer} />
		</div>
		<div class="row">
			<div class="label">Grouping</div>
			<input type="text" bind:value={grouping} />
		</div>
		<div class="row">
			<div class="label">Genre</div>
			<input type="text" bind:value={genre} />
		</div>
		<div class="row">
			<div class="label">Year</div>
			<input class="medium" type="text" bind:value={year} />
		</div>
		<div class="row num">
			<div class="label">Track</div>
			<input class="num" type="text" bind:value={track_num} class:big={big(track_num)} />
			<div class="midtext">of</div>
			<input class="num" type="text" bind:value={track_count} class:big={big(track_count)} />
		</div>
		<div class="row num">
			<div class="label">Disc number</div>
			<input class="num" type="text" bind:value={disc_num} class:big={big(disc_num)} />
			<div class="midtext">of</div>
			<input class="num" type="text" bind:value={disc_count} class:big={big(disc_count)} />
		</div>
		<div class="row">
			<div class="label">Compilation</div>
			<p>{compilation ? 'Yes' : 'No'}</p>
		</div>
		<div class="row">
			<div class="label">Rating</div>
			<p>{rating}, {liked ? 'Liked' : 'Not Liked'}</p>
		</div>
		<div class="row">
			<div class="label">BPM</div>
			<input class="medium" type="text" bind:value={bpm} />
		</div>
		<div class="row">
			<div class="label">Play count</div>
			<p>{play_count}</p>
		</div>
		<div class="row">
			<div class="label">Comments</div>
			<input type="text" bind:value={comments} />
		</div>
		<div class="spacer"></div>
	</main>
	{#snippet buttons()}
	
			<Button secondary on:click={cancel}>Cancel</Button>
			<Button type="submit" on:click={() => save()}>Save</Button>
		
	{/snippet}
</Modal>

<style lang="sass">
	$cover-size: 90px
	.modal
		width: 450px
	.header
		display: flex
		align-items: stretch
		min-height: $cover-size
		&.has-subtitle
			margin-bottom: 7px
	.spacer
		height: 15px
	.text
		flex-grow: 1
		display: flex
		flex-direction: column
		justify-content: center
	.name
		font-size: 18px
		font-weight: 500
	.artist
		font-size: 13px
		opacity: 0.7
	.cover-area
		margin-right: 20px
		position: relative
		outline: none
		&:focus .outline-element
			box-shadow: 0px 0px 0px 2px var(--accent-1)
		&.droppable .outline-element
			box-shadow: 0px 0px 0px 2px var(--accent-1)
		&:focus.droppable .outline-element
			box-shadow: 0px 0px 0px 4px var(--accent-1)
	.cover
		transition: box-shadow 40ms ease-out
		width: $cover-size
		height: $cover-size
		display: flex
		align-items: center
		justify-content: center
		img
			display: block
			max-width: $cover-size
			max-height: $cover-size
		svg.cover-svg
			display: block
			padding: 26px
			width: $cover-size
			height: $cover-size
			box-sizing: border-box
			background: var(--empty-cover-bg-color)
			fill: var(--empty-cover-color)
			border-radius: 2px
	.cover-subtitle
		position: absolute
		font-size: 11px
		opacity: 0.8
		width: 100%
		margin-top: 1px
		text-align: center
		display: flex
		align-items: center
		justify-content: center
		.subtitle-text
			width: 36px
		.arrow
			margin-top: 1px
			display: flex
			color: #ffffff
			&.unclickable
				pointer-events: none
				svg
					opacity: 0.35
		svg
			background-color: transparent
			outline: none
			border: none
			padding: 0px
			opacity: 1
			transition: 0.05s ease-out
			&:active
				opacity: 0.7
				transform: scale(0.95)
	.row
		padding: 2px 0px
		display: flex
		align-items: center
		line-height: normal
		height: 27px
	input
		flex-grow: 1
		font-size: 13px
		padding: 3px 4px
		background-color: transparent
		color: inherit
		border: 1px solid rgba(#ffffff, 0.25)
		box-sizing: border-box
		&.num
			width: 30px
			flex-grow: 0
		&.big
			width: 50px
			flex-grow: 0
		&.medium
			width: 80px
			flex-grow: 0
		&:focus
			outline: 2px solid var(--accent-1)
			outline-offset: -1px
	p
		padding: 3px 0px
		font-size: 13px
		margin: 0px
	.label
		display: inline-block
		text-align: right
		width: 80px
		margin-right: 8px
		font-size: 12px
		opacity: 0.7
	.midtext
		display: inline-block
		width: 20px
		text-align: center
		line-height: normal
</style>
