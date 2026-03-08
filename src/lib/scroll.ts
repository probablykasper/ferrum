import { cubicOut } from 'svelte/easing'

export class ScrollAnimation {
	frame_id: number | null = null

	cancel() {
		if (this.frame_id !== null) {
			cancelAnimationFrame(this.frame_id)
			this.frame_id = null
		}
	}

	smooth_scroll_to(element: HTMLElement, top: number, duration_ms = 200) {
		this.cancel()
		if (!element.isConnected) {
			return
		}
		const max_top = Math.max(0, element.scrollHeight - element.clientHeight)
		const target_top = Math.max(0, Math.min(top, max_top))
		const reduced_motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
		if (reduced_motion) {
			element.scrollTop = target_top
			return
		}
		const start_top = element.scrollTop
		const start_ts = performance.now()
		const frame = (now: number) => {
			const p = Math.min(1, (now - start_ts) / duration_ms)
			element.scrollTop = start_top + (target_top - start_top) * cubicOut(p)
			if (p < 1) {
				this.frame_id = requestAnimationFrame(frame)
			} else {
				this.frame_id = null
			}
		}
		this.frame_id = requestAnimationFrame(frame)
	}
}
