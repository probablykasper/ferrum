<script lang="ts" generics="T">
  import { onDestroy } from 'svelte'

  export let items: T[]
  export let item_height: number
  export let scroll_container: HTMLElement
  export let get_key: (item: T, i: number) => number | string
  export let buffer = 5

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

  function refresh() {
    const element_top = main_element.offsetTop
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

  export function scroll_to_index(index: number) {
    const element_top = main_element.offsetTop
    const top = index * item_height + element_top
    if (scroll_container.scrollTop > top) {
      scroll_container.scrollTop = top
    } else if (scroll_container.scrollTop + scroll_container.clientHeight < top + item_height) {
      scroll_container.scrollTop = top + item_height - scroll_container.clientHeight
    }
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
