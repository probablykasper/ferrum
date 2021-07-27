<script lang="ts">
  export let visible = false
  export let close = () => {
    visible = false
  }
</script>

{#if visible}
  <div class="backdrop" on:click|self={close}>
    <div class="box">
      <slot />
    </div>
  </div>
{/if}

<style lang="sass">
  .backdrop
    position: fixed
    width: 100%
    height: 100%
    top: 0
    left: 0
    display: flex
    align-items: center
    justify-content: center
    padding: 20px
    box-sizing: border-box
    background-color: rgba(#000000, 0.5)
    outline: none
    .box
      background-color: #191B20
      border: 1px solid rgba(#ffffff, 0.2)
      max-width: 100%
      max-height: 100%
      padding: 20px 20px
      box-sizing: border-box
      border-radius: 7px
      box-shadow: 0px 0px 30px 0px rgba(#000000, 0.5)
      overflow: auto
</style>
