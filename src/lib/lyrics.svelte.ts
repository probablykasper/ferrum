import { queue_visible } from './queue'
import { ipc_renderer } from './window'

class LyricsState {
	visible = $state(false)

	toggle() {
		this.visible = !this.visible
	}
}

export const lyrics_state = new LyricsState()
$effect.root(() => {
	ipc_renderer.invoke('update:Show Lyrics', lyrics_state.visible)
})

export function toggle_lyrics_visibility() {
	if (!lyrics_state.visible) {
		queue_visible.set(false)
	}
	lyrics_state.toggle()
}
