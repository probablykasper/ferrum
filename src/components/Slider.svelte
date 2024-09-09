<script lang="ts">
  import type { HTMLBaseAttributes } from 'svelte/elements'
  export let value: number
  export let min = 0
  export let max = 100
  export let step: number | undefined = undefined
  export let update_on_drag = true
  export let on_apply: (value: number) => void = () => {}
  export let klass = ''
  export { klass as class }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface $$Props extends HTMLBaseAttributes {
    value: number
    min?: number
    max?: number
    step?: number
    class?: string
    on_apply?: (value: number) => void
  }

  let element: HTMLInputElement
  let dragging = false

  let internal_value = value
  $: if (element && (update_on_drag || !dragging)) {
    internal_value = value
    element.value = String(value)
  }
</script>

<div class="slider{` ${klass}`.trimEnd()}" {...$$restProps}>
  <div
    class="group relative flex h-5 w-full items-center justify-center py-2 px-1"
    style:--slider-value="{((min + internal_value) / max) * 100}%"
  >
    <input
      bind:this={element}
      type="range"
      value={internal_value}
      {min}
      {max}
      {step}
      class="px-inherit absolute h-5 w-full appearance-none rounded-full border-none bg-transparent px-[inherit]"
      on:focus={(e) => {
        if (e.relatedTarget instanceof HTMLElement) {
          e.relatedTarget.focus()
        } else {
          e.currentTarget.blur()
        }
      }}
      on:input={(e) => {
        internal_value = Number(e.currentTarget.value)
        if (update_on_drag) {
          value = internal_value
        }
      }}
      on:mousedown={() => (dragging = true)}
      on:mouseup={(e) => {
        dragging = false
        value = Number(e.currentTarget.value)
        on_apply(value)
      }}
    />
    <div class="pointer-events-none relative w-full">
      <div class="w-full overflow-hidden rounded-full">
        <div
          class="relative -left-full h-1 w-full rounded-full rounded-full bg-gray-300 transition duration-100 will-change-transform group-hover:bg-[hsl(217,100%,60%)]"
          style:translate="var(--slider-value)"
        ></div>
      </div>
      <div class="absolute top-0 flex size-full items-center" style:translate="var(--slider-value)">
        <div
          class="thumb size-2.5 -translate-x-[50%] scale-[0.4] rounded-full bg-gray-300 opacity-0 shadow-md transition duration-75 group-hover:scale-100 group-hover:opacity-100"
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
  ::-webkit-slider-runnable-track {
    background-color: var(--color-gray-700);
    border-radius: 100px;
    height: 4px;
  }
  input::-webkit-slider-thumb {
    appearance: none;
    opacity: 0;
    width: 0px;
    height: 0px;
  }
</style>
