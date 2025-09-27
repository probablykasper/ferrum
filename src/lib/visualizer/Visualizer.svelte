<script lang="ts">
	import { start_visualizer } from './visualizer'
	import { ShaderToyLite } from './ShaderToyLite.js'
	import { onMount } from 'svelte'
	import { audioContext, mediaElementSource } from '$lib/player'

	const canvas_id = 'visualizer'

	onMount(() => {
		const a = `
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
					float t = iTime/2. - i * PI / BALLS * cos(iTime / max(i, 0.0001));
					vec2 p = vec2(cos(t), sin(t)) / sin(i / BALLS * PI / dist + iTime);
					vec3 c = cos(vec3(0, 5, -5) * PI * 2. / PI + PI * (iTime / (i+1.) / 5.)) * (GLOW) + (GLOW);
					fragColor += vec4(vec3(dist * .35 / length(uv - p * ORB_SIZE) * c), 1.0);
				}
				fragColor.xyz = pow(fragColor.xyz, vec3(CONTRAST));
			}
			`
		const image = `
			void mainImage( out vec4 fragColor, in vec2 fragCoord ) {  
					vec2 uv = fragCoord.xy / iResolution.xy;
					vec4 col = texture(iChannel0, uv);
					fragColor = vec4(col.rgb, 1.);
			}
			`
		const toy = new ShaderToyLite(canvas_id)
		toy.setCommon('')
		toy.setBufferA({ source: a })
		toy.setImage({ source: image, iChannel0: 'A' })
		toy.play()
		console.log('start')
		const visualizer = start_visualizer(audioContext, mediaElementSource, (info) => {
			console.log('update', info.stream, info.volume)
		})

		return () => {
			visualizer.destroy()
		}
	})
</script>

<div class="fixed top-0 left-0 flex h-screen w-screen items-center justify-center">
	<canvas id={canvas_id} width="840" height="472"></canvas>
</div>
