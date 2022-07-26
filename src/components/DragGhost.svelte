<script lang="ts" context="module">
  export let dragEl: HTMLElement
  let dragElDiv: HTMLElement
  export function setInnerText(text: string) {
    dragElDiv.innerText = text
  }
</script>

<div class="drag-ghost" bind:this={dragEl}>
  <div bind:this={dragElDiv} />
</div>

<style lang="sass">
  .drag-ghost
    font-size: 14px
    top: -1000px
    position: absolute
    background-color: transparent
    padding-left: 3px
    div
      background-color: var(--drag-bg-color)
      padding: 4px 8px
      max-width: 300px
      border-radius: 3px
</style>
