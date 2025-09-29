// Based on kaleidosync code

import { create_singular_request_animation_frame } from '$lib/helpers'
import { scaleLinear } from 'd3-scale'
import Meyda from 'meyda'
export type AudioStream = [number, number]
export type AudioStreamDefinitions = AudioStream[]

const visualizer_settings = {
	disableFlashing: false,
	def: [2.5, 0.09],
}

const BIT_DEPTH = Math.pow(2, 10)
const FILTER_TYPE = 'lowpass'
const FILTER_FREQUENCY = 7500
const FILTER_Q = 0.75

export function start_visualizer(
	audio_context: AudioContext,
	media_element_source: MediaElementAudioSourceNode,
	on_update: (info: { stream: number; volume: number }) => void,
) {
	const analyser = audio_context.createAnalyser()
	const filter = audio_context.createBiquadFilter()
	const time_buffer = new Float32Array(BIT_DEPTH)
	const raf = create_singular_request_animation_frame()

	media_element_source.connect(filter)
	filter.connect(analyser)
	analyser.smoothingTimeConstant = 0
	analyser.fftSize = BIT_DEPTH
	filter.type = FILTER_TYPE
	filter.frequency.value = FILTER_FREQUENCY
	filter.Q.value = FILTER_Q

	let stream = 0
	let volume = 0

	const def = visualizer_settings?.def || [2.5, 0.09]
	const volume_buffer: number[] = []

	// Pre-fill buffer with some baseline values to avoid initial instability
	for (let i = 0; i < 60; i++) {
		volume_buffer.push(0.1) // Small baseline value
	}

	function sample_volume(total_samples: number) {
		let value = 0
		const start = Math.max(volume_buffer.length - 1, 0)
		const end = Math.max(start - total_samples, 0)
		let min = Infinity
		for (let i = start; i >= end; i--) {
			value += volume_buffer[i]
			if (volume_buffer[i] < min) min = volume_buffer[i]
		}
		return [value / total_samples, min]
	}

	function measure_volume(frame_rate: number) {
		const raw_volume = get_raw_volume()
		volume_buffer.push(raw_volume)

		// Need minimum samples before doing complex calculations
		const min_samples_needed = Math.max(2, (def[1] * 1000) / (1000 / frame_rate))
		if (volume_buffer.length < min_samples_needed) {
			return 0.01 // Small default value while buffer builds up
		}

		const [ref, min] = sample_volume((def[0] * 1000) / (1000 / frame_rate))
		const [sample] = sample_volume((def[1] * 1000) / (1000 / frame_rate))

		// Avoid division by zero or very small differences
		const range = ref - min
		if (range < 0.001) {
			return 0.01 // Small default when no audio variance
		}

		const scaled = scaleLinear([min, ref], [0, 1])(sample)
		const raw = Number(Math.pow(scaled, 1.5).toFixed(3))
		return isNaN(raw) ? 0.1 : Math.max(0, raw / 2) // Ensure non-negative
	}

	function get_raw_volume() {
		analyser.getFloatTimeDomainData(time_buffer)
		return (Meyda.extract('rms', time_buffer) as number) || 0
	}

	let destroyed = false

	function measure() {
		// TODO: avoid hardcoded framerate
		const vol = measure_volume(60)

		if (visualizer_settings.disableFlashing) {
			volume = 1
		} else {
			volume = vol
		}

		const playing = audio_context.state === 'running'

		stream = stream + Math.pow(vol, 0.75) / (playing ? 10 : 100)

		on_update({ stream, volume })

		if (!destroyed) {
			raf_id = raf(measure)
		}
	}

	let raf_id = raf(measure)

	return {
		destroy() {
			destroyed = true
			if (raf_id) {
				cancelAnimationFrame(raf_id)
			}
			analyser.disconnect()
			filter.disconnect()
		},
	}
}
