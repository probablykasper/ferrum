<script lang="ts">
	import Revealed from './Revealed.svelte'
	import Download from './Download.svelte'
</script>

<svelte:head>
	<title>Ferrum</title>
</svelte:head>

<Revealed
	class="ease-out-cubic mx-2 mt-20 mb-4 text-center transition-all"
	options={{ opacity: 0, scale: 0.9, duration: 750 }}
>
	<h1 class="inline-block text-7xl font-extrabold">Ferrum</h1>
</Revealed>
<Revealed
	class="ease-out-cubic mx-2 mb-12 text-center transition-all"
	options={{ opacity: 0, y: -10, duration: 550, delay: 250 }}
>
	<p class="ease-out-cubic text-xl text-blue-100 opacity-60 transition-all duration-500">
		Music library and player
	</p>
</Revealed>

<Revealed
	class="ease-out-cubic mb-24 flex justify-center transition-all"
	options={{ opacity: 0, scale: 0.9, duration: 550, delay: 450 }}
>
	<div>
		<Download />
	</div>
</Revealed>

<Revealed
	class="relative mx-auto mb-24 max-w-5xl px-6 transition-[transform,opacity] will-change-contents sm:px-8"
	options={{ opacity: 0, y: 10, duration: 750, delay: 350 }}
>
	<div class="gradient gradient-1 show-gradient absolute inset-0 -z-10 blur-[160px]"></div>
	<div class="relative">
		<div class="ripple absolute inset-0 -z-10 rounded-[5px]"></div>
		<img src="/screenshot-1.webp" alt="" />
	</div>
</Revealed>

<style lang="sass">
	h1
		background: linear-gradient(130deg,#3EFF8A 10%,#03B5FF 90%)
		background-clip: text
		text-fill-color: transparent
		-webkit-text-fill-color: transparent
	.gradient
		will-change: contents
		animation: show-gradient 3s ease-in-out forwards
		opacity: 0
		&.gradient-1
			background: conic-gradient(from 230.29deg at 50% 50%,#3EFF8A 0deg,#03B5FF 90deg,#3EFF8A 180deg,#03B5FF 270deg,#1fff8b 360deg)
	@keyframes show-gradient
		0%
			opacity: 0
		50%
			opacity: 0.7
		100%
			opacity: 0.5
	.ripple
		box-shadow: 0px 0px 0px 1px hsla(0, 0%, 100%, 0.1), 0px 0px 0px 4px hsla(0, 0%, 100%, 0.15)
</style>
