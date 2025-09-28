<script lang="ts">
	import { start_visualizer } from './visualizer'
	import { ShaderToyLite } from './ShaderToyLite.js'
	import { onMount } from 'svelte'
	import { audioContext, mediaElementSource } from '$lib/player'
	import Player from '$components/Player.svelte'
	import { fly } from 'svelte/transition'
	import { check_modifiers } from '$lib/helpers'

	let { on_close }: { on_close: () => void } = $props()

	let canvas: HTMLCanvasElement | undefined
	const canvas_id = 'visualizer'
	let toy: ShaderToyLite | undefined

	const shaders = {
		'Color Warp by yozic': `
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
		'Bars by yozic': `
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
	}

	onMount(() => {
		const a = shaders['Bars by yozic']
		const image = `
			void mainImage( out vec4 fragColor, in vec2 fragCoord ) {  
				vec2 uv = fragCoord.xy / iResolution.xy;
				vec4 col = texture(iChannel0, uv);
				fragColor = vec4(col.rgb, 1.);
			}
		`
		toy = new ShaderToyLite(canvas_id)
		toy.setCommon('')
		toy.setBufferA({ source: a })
		toy.setImage({ source: image, iChannel0: 'A' })
		toy.play()
		const visualizer = start_visualizer(audioContext, mediaElementSource, (info) => {
			toy?.setStream(info.stream)
			toy?.setVolume(info.volume)
		})

		return () => {
			visualizer.destroy()
			toy?.pause()
		}
	})

	let show_player = $state(false)
	let hide_player_timeout: ReturnType<typeof setTimeout> | undefined
	function show_player_temporarily() {
		show_player = true
		clearTimeout(hide_player_timeout)
		hide_player_timeout = setTimeout(() => {
			show_player = false
		}, 1000)
	}
</script>

<svelte:window
	on:resize={() => {
		if (canvas) {
			canvas.width = window.innerWidth
			canvas.height = window.innerHeight
			toy?.resize()
		}
	}}
/>

<dialog
	class="overflow-hidden"
	{@attach (e) => {
		e.showModal()
	}}
	onclose={() => {
		on_close()
	}}
	onkeydown={(e) => {
		if (check_modifiers(e, {})) {
			show_player_temporarily()
		}
	}}
>
	<div class="h-screen w-screen">
		<canvas
			bind:this={canvas}
			class="fixed inset-0"
			id={canvas_id}
			width={window.innerWidth}
			height={window.innerHeight}
			onmousemove={show_player_temporarily}
		></canvas>
		{#if show_player}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="fixed bottom-0 flex w-full flex-col justify-end"
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
