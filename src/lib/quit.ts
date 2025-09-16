import { ipc_renderer } from './window'

let unfinished_tasks = 0
export function not_ready() {
	unfinished_tasks++
}
export function ready() {
	unfinished_tasks--
	try_to_quit()
}

type Callback = () => void | Promise<void>
interface Handlers {
	[key: string]: Callback
}
const handlers: Handlers = {}
function set_handler(name: string, callback: Callback) {
	handlers[name] = callback
}

export default { not_ready, ready, set_handler }

function try_to_quit() {
	if (unfinished_tasks === 0) {
		ipc_renderer.send('readyToQuit')
	}
}

not_ready()
ipc_renderer.on('gonnaQuit', async function () {
	for (const key of Object.keys(handlers)) {
		const handler = handlers[key]
		const async_handler = await Promise.resolve(handler)
		await async_handler()
	}
	ready()
})
