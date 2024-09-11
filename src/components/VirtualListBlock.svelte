<script lang="ts" generics="T">
  import { onDestroy } from 'svelte'

  // eslint-disable-next-line no-undef
  type X = T

  export let items: X[]
  export let item_height: number
  /** Must be a positioned element, like `position: relative` */
  export let scroll_container: HTMLElement
  export let get_key: (item: X, i: number) => number | string = (_, i) => i
  export let buffer = 0

  $: height = items.length * item_height
  $: buffer_height = buffer * item_height

  let main_element: HTMLDivElement
  let start_pixel = 0
  let start_index = 0
  let visible_count = 0

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

  function refresh() {
    let element_top = main_element.offsetTop
    let offset_parent = main_element.offsetParent
    while (offset_parent !== scroll_container && offset_parent instanceof HTMLElement) {
      element_top += offset_parent.offsetTop
      offset_parent = offset_parent.offsetParent
    }

    const element_bottom = element_top + height

    // The currently visible area of the container
    const scroll_top = scroll_container.scrollTop - buffer_height
    const scroll_bottom = scroll_container.scrollTop + scroll_container.clientHeight + buffer_height

    // The first visible pixel
    start_pixel = Math.min(element_bottom, Math.max(element_top, scroll_top)) - element_top

    // The last visible pixel
    const end_pixel = Math.max(element_top, Math.min(element_bottom, scroll_bottom)) - element_top

    start_index = Math.floor(start_pixel / item_height)
    visible_count = Math.ceil(end_pixel / item_height) - start_index
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

  export function scroll_to_index(index: number, offset: number) {
    const dummy = document.createElement('div')
    dummy.style.height = item_height + 'px'
    dummy.style.position = 'absolute'
    dummy.style.top = index * item_height + 'px'
    // For some reason we apply the offset to the bottom
    dummy.style.scrollMarginBottom = offset + 'px'
    main_element.prepend(dummy)
    dummy.scrollIntoView({ behavior: 'instant', block: 'nearest' })
  }
</script>

<div
  bind:this={main_element}
  style:padding-top={start_index * item_height + 'px'}
  style:height={items.length * item_height + 'px'}
>
  {#each { length: visible_count } as _, i (get_key(items[i + start_index], i + start_index))}
    <slot item={items[i + start_index]} i={i + start_index} />
  {/each}
</div>
