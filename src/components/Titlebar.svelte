<script lang="ts">
  export let dev = false
</script>

<template lang="pug">
  .titlebar(class:dev='{dev}' on:mousedown|self|preventDefault)
</template>

<style lang="sass">
  .titlebar.dev
    background: linear-gradient(90deg, #0fb3ff, #9417e8)
    opacity: 0.5
  .titlebar
    height: 21px
    width: 100%
    position: absolute
    -webkit-app-region: drag
</style>
