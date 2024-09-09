<script lang="ts">
  import type { HTMLBaseAttributes } from 'svelte/elements'
  export let value: number
  export let max = 100
  export let update_on_drag = true
  export let on_apply: (value: number) => void = () => {}
  export let klass = ''
  export { klass as class }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface $$Props extends HTMLBaseAttributes {
    value: number
    max?: number
    step?: number
    class?: string
    update_on_drag?: boolean
    on_apply?: (value: number) => void
  }

  let bar: HTMLDivElement
  let dragging = false

  let internal_value = value
  $: if (update_on_drag || !dragging) {
    // Only update if the difference is 0.5px+
    const diff_px = Math.abs(internal_value - value) * bar?.clientWidth * devicePixelRatio
    if (diff_px > 0.5) {
      internal_value = value
    } else if (!bar) {
      internal_value = value
    }
  }

  function apply(e: MouseEvent) {
    const delta = e.clientX - bar.getBoundingClientRect().left
    internal_value = Math.min(max, Math.max(0, (delta / bar.clientWidth) * max))
    if (update_on_drag || !dragging) {
      value = internal_value
    }
  }
</script>

<svelte:window
  on:mousemove={(e) => {
    if (dragging) {
      apply(e)
    }
  }}
  on:mouseup={(e) => {
    if (dragging) {
      dragging = false
      apply(e)
      on_apply(value)
    }
  }}
/>
<!-- We use custom mouse events because updating an <input> value causes reflow -->
<div class="slider{` ${klass}`.trimEnd()}" {...$$restProps}>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="group flex h-5 w-full items-center justify-center py-2 px-1"
    on:mousedown={(e) => {
      apply(e)
      dragging = true
    }}
  >
    <div class="pointer-events-none relative w-full rounded-full bg-gray-700" bind:this={bar}>
      <div class="w-full overflow-hidden rounded-full">
        <!-- I tried the Web Animation API, but somehow that resulted in higher CPU usage -->
        <div
          class="relative -left-full h-1 w-full rounded-full bg-gray-300 transition-colors duration-100 will-change-transform group-hover:bg-[hsl(217,100%,60%)] group-active:bg-[hsl(217,100%,60%)]"
          style:translate="{(internal_value / max) * 100}%"
        ></div>
      </div>
      <div
        class="absolute top-0 flex size-full items-center will-change-transform"
        style:translate="{(internal_value / max) * 100}%"
      >
        <div
          class="thumb size-2.5 -translate-x-[50%] scale-[0.4] rounded-full bg-gray-300 opacity-0 transition duration-75 group-hover:scale-100 group-hover:opacity-100 group-active:scale-100 group-active:opacity-100"
        ></div>
      </div>
    </div>
  </div>
</div>

<style>
  @layer base {
    .slider {
      width: 129px;
    }
  }
  .thumb {
    box-shadow: 0px 0px 5px 1px rgba(0, 0, 0, 0.5);
  }
</style>
