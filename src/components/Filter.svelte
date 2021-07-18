<script lang="ts">
  import { page, filter } from '../stores/data'
  import { ipcRenderer } from '../stores/window'
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

<template lang="pug">
  input.search(type='text' class:on='{$filter}' use:filterCmd bind:value='{$filter}' placeholder='Filter')
</template>

<style lang="sass">
  .search
    display: block
    width: calc(100% - 15px*2)
    margin: auto
    transition: border 150ms cubic-bezier(0.0, 0.0, 0.2, 1)
    font-family: inherit
    padding: 3px 12px
    box-sizing: border-box
    color: var(--text-color)
    background-color: rgba(#ffffff, 0.15)
    border-radius: 3px
    outline: none
    border: 3px solid transparent
    &.on:focus
      border: 3px solid var(--outline-color)
    &.on
      border: 3px solid var(--outline-color-disabled)
</style>
