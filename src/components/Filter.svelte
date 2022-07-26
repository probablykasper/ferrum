<script lang="ts">
  import { filter } from '../lib/data'
  import { ipcRenderer } from '../lib/window'
  function filterCmd(node: HTMLInputElement) {
    function handler() {
      node.select()
    }
    ipcRenderer.on('filter', handler)
    return {
      destroy: () => ipcRenderer.off('filter', handler),
    }
  }
</script>

<input
  type="text"
  class="search"
  class:on={$filter}
  use:filterCmd
  bind:value={$filter}
  placeholder="Filter"
/>

<style lang="sass">
  input.search
    display: block
    width: calc(100% - 15px*2)
    margin: auto
    font-family: inherit
    padding: 5px 12px
    box-sizing: border-box
    color: inherit
    background-color: hsla(var(--hue), 68%, 90%, 0.08)
    outline: none
    border: 1px solid rgba(255, 255, 255, 0.15)
    &:focus
      background-color: hsla(var(--hue), 65%, 60%, 0.2)
      outline: 2px solid var(--accent-1)
      outline-offset: -1px
    &.on:focus
      outline: 2px solid hsl(160, 60%, 40%)
    &.on
      background-color: hsla(160, 65%, 60%, 0.15)
      border: 1px solid hsl(160, 50%, 60%, 0.2)
</style>
