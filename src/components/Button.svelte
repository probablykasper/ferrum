<script lang="ts">
  export let secondary = false
  export let submit = false
  $: buttonType = submit === true ? 'submit' : 'button'
</script>

<button class:secondary type={buttonType} on:click>
  <slot />
</button>

<style lang="sass">
  button
    color: #ffffff
    padding: 6px 0px
    background-color: var(--accent-2)
    box-shadow: 0px 0px 2px 0px var(--accent-2)
    border: 2px solid transparent
    margin: 2px
    margin-left: 10px
    width: 80px
    border-radius: 7px
    transition: 0.1s ease-in-out
    transition-property: transform, opacity
    outline: none
    &:focus
      border: 2px solid rgba(#7e9bf1, 0.7)
    &:active
      outline: none
      opacity: 0.8
      transform: scale(0.95)
  button.secondary
    background-color: #373e53
    box-shadow: 0px 0px 2px 0px #373e53
    &:focus
      border: 2px solid rgba(#7e9bf1, 0.5)
</style>
