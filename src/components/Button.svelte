<script lang="ts">
	import { run, createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import type { HTMLBaseAttributes } from 'svelte/elements'

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	

	interface Props {
		secondary?: boolean;
		danger?: boolean;
		type?: 'button' | 'submit' | 'reset';
		children?: import('svelte').Snippet;
		[key: string]: any
	}

	let {
		secondary = false,
		danger = false,
		type = 'button',
		children,
		...rest
	}: Props = $props();
	let normal = $state(!danger && !secondary)
	run(() => {
		normal = !danger && !secondary
	});
</script>

<button onclick={bubble('click')} onmousedown={bubble('mousedown')} class:normal class:secondary class:danger {type} {...rest}>
	{@render children?.()}
</button>

<style lang="sass">
	button
		padding: 7px 20px
		margin: 0px
		margin-left: 10px
		font-size: 14px
		border: none
		color: #ffffff
		font-weight: 400
		background-color: transparent
		position: relative
		outline: none
		z-index: 1
		user-select: none
		line-height: normal
		&::before
			content: ''
			position: absolute
			z-index: -1
			left: 0px
			top: 0px
			bottom: 0px
			right: 0px
			border-radius: 7px
			transition: all 120ms var(--cubic-out)
	button.normal
		&::before
			background-color: hsl(220, 100%, 46%)
			border: 1px solid hsla(0, 0%, 100%, 0.2)
		&:hover::before
			background-color: hsl(220, 100%, 52%)
			transform: scale(1.04, 1)
		&:focus::before
			box-shadow: 0px 0px 0px 3px hsla(220, 100%, 50%, 0.5)
	button.secondary
		&::before
			background-color: hsl(220, 20%, 25%)
			border: 1px solid hsla(0, 0%, 100%, 0.1)
		&:hover::before
			background-color: hsl(220, 20%, 31%)
			transform: scale(1.04, 1)
		&:focus::before
			border-color: hsla(220, 30%, 50%, 1)
			box-shadow: 0px 0px 0px 3px hsla(220, 30%, 50%, 0.5)
	button.danger
		&::before
			background-color: hsl(0, 100%, 40%)
			border: 1px solid hsla(0, 0%, 100%, 0.25)
		&:hover::before
			background-color: hsl(0, 100%, 45%)
			transform: scale(1.04, 1)
		&:focus::before
			border-color: hsla(0, 100%, 70%, 1)
			box-shadow: 0px 0px 0px 3px hsla(0, 100%, 47%, 0.5)
</style>
