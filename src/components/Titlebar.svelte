<script lang="ts">
  export let dev = false
</script>

<style lang="sass">
  // .titlebar.dev
  //   background-color: #0b9fcb
  //   opacity: 0.5
  .titlebar
    height: 21px
    width: 100%
    position: absolute
    -webkit-app-region: drag
</style>

<template lang="pug">
  .titlebar(class:dev='{dev}' on:mousedown|self|preventDefault)
</template>
