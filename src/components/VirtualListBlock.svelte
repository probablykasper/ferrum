<script lang="ts" context="module">
	export function scroll_container_keydown(e: KeyboardEvent & { currentTarget: HTMLElement }) {
		let prevent = true
		if (e.key === 'Home') e.currentTarget.scrollTop = 0
		else if (e.key === 'End') e.currentTarget.scrollTop = e.currentTarget.scrollHeight
		else if (e.key === 'PageUp') e.currentTarget.scrollTop -= e.currentTarget.clientHeight
		else if (e.key === 'PageDown') e.currentTarget.scrollTop += e.currentTarget.clientHeight
		else prevent = false
		if (prevent) e.preventDefault()
	}
</script>

<script lang="ts" generics="T">
	import { onDestroy } from 'svelte'

	export let items: T[]
	export let item_height: number
	/** Must be a positioned element, like `position: relative` */
	export let scroll_container: HTMLElement
	export let buffer = 3

	$: height = items.length * item_height
	$: buffer_height = buffer * item_height

	let main_element: HTMLDivElement
	let start_pixel = 0
	let start_index = 0
	let visible_count = 0
	let visible_indexes: number[] = []

	$: {
		items, item_height, buffer
		if (scroll_container && main_element) refresh()
	}

	const resize_observer = new ResizeObserver(refresh)
	$: observe(scroll_container)
	function observe(scroll_container: HTMLElement | undefined) {
		resize_observer.disconnect()
		if (scroll_container) {
			resize_observer.observe(scroll_container)
		}
	}

	let ticking = false
	export function refresh() {
		if (ticking || !main_element || !scroll_container) {
			return
		}
		ticking = true
		requestAnimationFrame(() => {
			let element_top = main_element.offsetTop
			let offset_parent = main_element.offsetParent
			while (offset_parent !== scroll_container && offset_parent instanceof HTMLElement) {
				element_top += offset_parent.offsetTop
				offset_parent = offset_parent.offsetParent
			}

			const element_bottom = element_top + height

			// The currently visible area of the container
			const scroll_top = scroll_container.scrollTop - buffer_height
			const scroll_bottom =
				scroll_container.scrollTop + scroll_container.clientHeight + buffer_height

			// The first visible pixel
			start_pixel = Math.min(element_bottom, Math.max(element_top, scroll_top)) - element_top

			// The last visible pixel
			const end_pixel = Math.max(element_top, Math.min(element_bottom, scroll_bottom)) - element_top

			const total_pixels = end_pixel - start_pixel

			start_index = Math.floor(start_pixel / item_height)
			visible_count = Math.ceil(total_pixels / item_height)
			const end_index = start_index + visible_count

			// first, figure out which new indexes are now visible
			const new_visible_indexes = []
			for (let i = start_index; i < end_index; i++) {
				if (!visible_indexes.includes(i)) {
					new_visible_indexes.push(i)
				}
			}
			// then, update the visible indexes
			for (let i = 0; i < visible_indexes.length; i++) {
				// if the index is no longer visible
				if (visible_indexes[i] > end_index || visible_indexes[i] < start_index) {
					const new_index = new_visible_indexes.pop()
					// update it to a new visible index
					if (new_index !== undefined) {
						visible_indexes[i] = new_index
					} else {
						// if there are no new visible indexes left, remove it
						visible_indexes.splice(i, 1)
						i--
					}
				}
			}
			// add new visible indexes
			visible_indexes.push(...new_visible_indexes)
			visible_indexes = visible_indexes

			ticking = false
		})
	}

	$: apply_scroll_event_handler(scroll_container)

	let scroll_event_element: HTMLElement | undefined = scroll_container
	function apply_scroll_event_handler(container: HTMLElement | undefined) {
		scroll_event_element?.removeEventListener('scroll', refresh)
		scroll_event_element = container
		scroll_event_element?.addEventListener('scroll', refresh)
	}
	onDestroy(() => {
		scroll_event_element?.removeEventListener('scroll', refresh)
	})

	export function scroll_to_index(index: number, offset = 0) {
		const dummy = document.createElement('div')
		dummy.style.height = item_height + 'px'
		dummy.style.position = 'absolute'
		dummy.style.top = index * item_height + 'px'
		// For some reason we apply the offset to the bottom
		dummy.style.scrollMarginBottom = offset + 'px'
		// eslint-disable-next-line svelte/no-dom-manipulating
		main_element.prepend(dummy)
		dummy.scrollIntoView({ behavior: 'instant', block: 'nearest' })
		dummy.remove()
	}
</script>

<div bind:this={main_element} style:height={items.length * item_height + 'px'}>
	<slot {visible_indexes} />
</div>
