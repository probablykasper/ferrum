import { scaleLinear } from 'd3-scale'

const visualizer_settings = {
	disableFlashing: false,
	def: [2.5, 0.09],
}

const BIT_DEPTH = Math.pow(2, 10)
const FILTER_TYPE = 'lowpass'
const FILTER_FREQUENCY = 7500
const FILTER_Q = 0.75

export function start_visualizer(element: HTMLAudioElement) {
	const audioContext = new AudioContext()
	const mediaElementSource = audioContext.createMediaElementSource(element)

	const analyser = audioContext.createAnalyser()
	const filter = audioContext.createBiquadFilter()
	const analyserBuffer = new Uint8Array(BIT_DEPTH / 2)

	mediaElementSource.connect(filter)
	filter.connect(analyser)
	mediaElementSource.connect(audioContext.destination)
	analyser.smoothingTimeConstant = 0
	analyser.fftSize = BIT_DEPTH
	filter.type = FILTER_TYPE
	filter.frequency.value = FILTER_FREQUENCY
	filter.Q.value = FILTER_Q

	let stream = 0
	let volume = 1

	const def = visualizer_settings?.def || [2.5, 0.09]
	const volumeBuffer: number[] = []

	function sampleVolume(totalSamples: number) {
		let value = 0
		const start = Math.max(volumeBuffer.length - 1, 0)
		const end = Math.max(start - totalSamples, 0)
		let min = Infinity
		for (let i = start; i >= end; i--) {
			value += volumeBuffer[i]
			if (volumeBuffer[i] < min) min = volumeBuffer[i]
		}
		return [value / totalSamples, min]
	}

	function measure_volume(frameRate: number) {
		const rawVolume = getRawVolume()
		volumeBuffer.push(rawVolume)
		const [ref, min] = sampleVolume((def[0] * 1000) / (1000 / frameRate))
		const [sample] = sampleVolume((def[1] * 1000) / (1000 / frameRate))
		const scaled = scaleLinear([min, ref], [0, 1])(sample)
		const raw = Number(Math.pow(scaled, 1.5).toFixed(3))
		return isNaN(raw) ? 1 : raw / 2
	}

	function getRawVolume() {
		analyser.getByteFrequencyData(analyserBuffer)
		const len = BIT_DEPTH / 2
		let val = 0
		for (let i = 0; i < len; i++) val += analyserBuffer[i]
		return val / len
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

		const playing = audioContext.state === 'running'

		stream = stream + Math.pow(vol, 0.75) / (playing ? 10 : 100)

		if (!destroyed) {
			raf_id = requestAnimationFrame(measure)
		}
	}

	let raf_id = requestAnimationFrame(measure)

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
