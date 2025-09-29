<script lang="ts">
	import { start_visualizer } from './visualizer'
	import { ShaderToyLite } from './ShaderToyLite.js'
	import { onDestroy, onMount, untrack } from 'svelte'
	import { audioContext, mediaElementSource } from '$lib/player'
	import Player from '$components/Player.svelte'
	import { fly } from 'svelte/transition'
	import { check_modifiers } from '$lib/helpers'

	let { on_close }: { on_close: () => void } = $props()

	const shaders = [
		{
			name: 'Color Warp',
			author: 'yozic',
			shader: `
				#define WARP true
				#define BALLS 10.
				#define CONTRAST 3
				#define GLOW .1
				#define ORB_SIZE 0.492519
				#define PI 3.14159265359

				vec2 kale(vec2 uv, vec2 offset, float splits) {
					float angle = atan(uv.y, uv.x);
					angle = ((angle / PI) + 1.0) * 0.5;
					angle = mod(angle, 1.0 / splits) * splits;
					angle = -abs(2.0 * angle - 1.0) + 1.0;
					float y = length(uv);
					angle = angle * (y);
					return vec2(angle, y) - offset;
				}

				void mainImage (out vec4 fragColor, in vec2 fragCoord) {
					vec2 uv = 2. * fragCoord/iResolution.xy - 1.;
					uv.x *= iResolution.x / iResolution.y;
					uv *= 2.2;
					fragColor = vec4(0.);
					float dist = distance(uv, vec2(0.));
					uv = WARP ? uv * kale(uv, vec2(0.), 2.) : uv;
					for (float i = 0.; i < BALLS; i++) {
						float t = iStream/2. - i * PI / BALLS * cos(iStream / max(i, 0.0001));
						vec2 p = vec2(cos(t), sin(t)) / sin(i / BALLS * PI / dist + iStream);
						vec3 c = iVolume * cos(vec3(0, 5, -5) * PI * 2. / PI + PI * (iStream / (i+1.) / 5.)) * (GLOW) + (GLOW);
						fragColor += vec4(iVolume * vec3(dist * .35 / length(uv - p * ORB_SIZE) * c), 1.0);
					}
					fragColor.xyz = pow(fragColor.xyz, vec3(CONTRAST));
				}
			`,
		},
		{
			name: 'Bars',
			author: 'yozic',
			shader: `
				#define orbs 20.
				#define PI 3.14159265359
				#define zoom 24.950
				#define div 10.000
				#define div2 10.000
				#define radius 8.159
				#define orbSize 0.682
				#define colorShift 12.710
				#define contrast 0.902

				// Helper function to get normalized UV coordinates
				vec2 k_uv() {
					vec2 uv = 2. * gl_FragCoord.xy/iResolution.xy - 1.;
					uv.x *= iResolution.x / iResolution.y;
					return uv;
				}

				// Helper function to create orb effect
				vec4 k_orb(vec2 uv, float size, vec2 position, vec3 color, float contrast_val) {
					float d = length(uv - position);
					float intensity = size / (d + 0.001);
					intensity = pow(intensity, contrast_val);
					return vec4(color * intensity, 1.0);
				}

				void mainImage (out vec4 fragColor, in vec2 fragCoord) {
					vec2 uv = k_uv();
					uv *= zoom;
					fragColor = vec4(0.);
					
					for (float i = 0.; i < orbs; i++) {
						uv.y -= cos((i+1.)*uv.y/div - iStream);
						uv.x += cos((i+1.)*uv.y/div2 - iStream/1.5);
						float t = i * PI / orbs;
						float x = radius * tan(t + iStream/2.);
						float y = radius * cos(t - iStream/2.2) * sin(t-iStream/3.);
						vec2 position = vec2(x, y);
						vec3 color = cos(vec3(-2, 0, -1) * PI * 2. / 3. + PI * (i / colorShift)) * 0.5 + 0.5;
						fragColor += k_orb(uv, iVolume * orbSize, position, color, contrast);
					}
				}
			`,
		},
	]

	const imageShader = `
		void mainImage( out vec4 fragColor, in vec2 fragCoord ) {  
			vec2 uv = fragCoord.xy / iResolution.xy;
			vec4 col = texture(iChannel0, uv);
			fragColor = vec4(col.rgb, 1.);
		}
	`
	function create_toy(canvas: HTMLCanvasElement) {
		const toy = new ShaderToyLite(canvas)
		toy.setCommon('')
		toy.setImage({ source: imageShader, iChannel0: 'A' })
		return toy
	}

	// main visualizer, and a transition visualizer
	type Vis = {
		is_main: boolean
		canvas?: HTMLCanvasElement
		toy?: ShaderToyLite
		should_resize?: boolean
	}
	const visualisers: [Vis, Vis] = $state([
		{
			id: 'vis-0',
			is_main: true,
		},
		{
			id: 'vis-1',
			is_main: false,
		},
	])
	let main_vis = visualisers[0]
	let next_vis = visualisers[1]

	let currentShaderIndex = 0
	let isTransitioning = false
	let autoTransitionTimeout: ReturnType<typeof setTimeout> | undefined

	const visualizer = start_visualizer(audioContext, mediaElementSource, (info) => {
		main_vis.toy?.setStream(info.stream)
		main_vis.toy?.setVolume(info.volume)
		// Also update transition toy if it exists
		next_vis.toy?.setStream(info.stream)
		next_vis.toy?.setVolume(info.volume)
	})

	let pendingTransition: number | null = null

	async function transitionToShader(newShaderIndex: number, duration = 2000) {
		if (isTransitioning) {
			pendingTransition = newShaderIndex
			return
		}
		if (currentShaderIndex === newShaderIndex) return

		if (!main_vis.canvas || !next_vis.canvas) {
			return console.error('Missing canvas')
		}

		console.log('Starting transition to:', newShaderIndex)
		isTransitioning = true
		clearTimeout(autoTransitionTimeout)

		// Start transition visualizer
		if (!next_vis.toy) {
			next_vis.toy = create_toy(next_vis.canvas)
		}
		if (next_vis.should_resize) {
			next_vis.should_resize = false
			schedule_resize(next_vis)
		}
		next_vis.toy.setBufferA({ source: shaders[newShaderIndex].shader })
		next_vis.toy.play()

		const animation_new = next_vis.canvas.animate(
			{ opacity: [0, 1] },
			{
				duration: duration,
				easing: 'cubic-bezier(0.45, 0, 0.55, 1)', // quadInOut
				fill: 'forwards',
			},
		)
		const animation_old = main_vis.canvas.animate(
			{ opacity: [1, 0] },
			{
				duration: duration,
				easing: 'cubic-bezier(0.45, 0, 0.55, 1)', // quadInOut
				fill: 'forwards',
			},
		)
		await animation_new.finished
		await animation_old.finished

		await new Promise((resolve) => setTimeout(resolve, duration))

		next_vis.is_main = true
		main_vis.is_main = false
		// Swap
		;[main_vis, next_vis] = [next_vis, main_vis]

		next_vis.toy?.pause() // Keep the instance for later use

		currentShaderIndex = newShaderIndex
		isTransitioning = false

		scheduleAutoTransition()

		if (pendingTransition !== null) {
			const nextIndex = pendingTransition
			pendingTransition = null
			transitionToShader(nextIndex)
		}
	}

	function scheduleAutoTransition() {
		clearTimeout(autoTransitionTimeout)
		autoTransitionTimeout = setTimeout(() => {
			if (!isTransitioning) {
				const nextIndex = (currentShaderIndex + 1) % shaders.length
				transitionToShader(nextIndex)
			}
		}, 10000)
	}

	scheduleAutoTransition()

	let show_player = $state(false)
	let hide_player_timeout: ReturnType<typeof setTimeout> | undefined
	function show_player_temporarily() {
		show_player = true
		clearTimeout(hide_player_timeout)
		hide_player_timeout = setTimeout(() => {
			show_player = false
		}, 1000)
	}

	function schedule_resize(vis: Vis) {
		if (!isTransitioning && !vis.is_main) {
			vis.should_resize = true
			return
		}
		if (vis.canvas) {
			vis.canvas.width = window.innerWidth
			vis.canvas.height = window.innerHeight
			vis.toy?.resize()
		}
	}

	onDestroy(() => {
		clearTimeout(autoTransitionTimeout)
		visualizer.destroy()
		main_vis.toy?.destroy()
		next_vis.toy?.destroy()
	})
</script>

<svelte:window
	on:resize={() => {
		for (const vis of visualisers) {
			schedule_resize(vis)
		}
	}}
/>

<dialog
	class="max-h-screen max-w-screen bg-black outline-none"
	{@attach (e) => {
		e.showModal()
	}}
	onclose={() => {
		on_close()
	}}
	onkeydown={(e) => {
		if (check_modifiers(e, {})) {
			if (e.key === 'ArrowLeft') {
				transitionToShader((currentShaderIndex - 1 + shaders.length) % shaders.length, 500)
			} else if (e.key === 'ArrowRight') {
				transitionToShader((currentShaderIndex + 1) % shaders.length, 500)
			} else if (/^[0-9]$/.test(e.key)) {
				transitionToShader(Math.min(currentShaderIndex + 1, shaders.length - 1), 500)
			} else {
				show_player_temporarily()
			}
		}
	}}
>
	<div class="h-screen w-screen">
		{#each visualisers as vis, i (vis)}
			<canvas
				bind:this={vis.canvas}
				class="fixed inset-0"
				style:z-index={vis.is_main ? '1' : '2'}
				class:mix-blend-screen={!vis.is_main}
				width={window.innerWidth}
				height={window.innerHeight}
				onmousemove={show_player_temporarily}
				{@attach (canvas) => {
					vis.canvas = canvas
					if (vis.is_main && !vis.toy) {
						const toy = create_toy(canvas)
						toy.setBufferA({ source: shaders[0].shader })
						toy.play()
						vis.toy = toy
					}
				}}
			></canvas>
		{/each}
		{#if show_player}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="fixed bottom-0 z-10 flex w-full flex-col justify-end"
				transition:fly={{ y: '100%', duration: 500 }}
				onmouseenter={() => {
					show_player = true
					clearTimeout(hide_player_timeout)
				}}
				onmouseleave={show_player_temporarily}
			>
				<Player on_toggle_visualizer={on_close} />
			</div>
		{/if}
	</div>
</dialog>
