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
  input.search
    display: block
    width: calc(100% - 15px*2)
    margin: auto
    font-family: inherit
    padding: 5px 12px
    box-sizing: border-box
    color: inherit
    background-color: hsla(var(--hue), 68%, 90%, 0.08)
    border-radius: 3px
    outline: none
    border: 2px solid transparent
    &:focus
      background-color: hsla(var(--hue), 68%, 90%, 0.1)
    &.on:focus
      border: 2px solid hsla(var(--hue), 60%, 50%, 1)
    &.on
      border: 2px solid hsl(var(--hue), 15%, 35%)
      background-color: hsla(var(--hue), 68%, 90%, 0.1)
</style>
