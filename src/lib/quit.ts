import { ipcRenderer } from './window'

let unfinishedTasks = 0
export function notReady() {
	unfinishedTasks++
}
export function ready() {
	unfinishedTasks--
	tryToQuit()
}

type Callback = () => void | Promise<void>
interface Handlers {
	[key: string]: Callback
}
const handlers: Handlers = {}
function setHandler(name: string, callback: Callback) {
	handlers[name] = callback
}

export default { notReady, ready, setHandler }

function tryToQuit() {
	if (unfinishedTasks === 0) {
		ipcRenderer.send('readyToQuit')
	}
}

notReady()
ipcRenderer.on('gonnaQuit', async function () {
	for (const key of Object.keys(handlers)) {
		const handler = handlers[key]
		const asyncHandler = await Promise.resolve(handler)
		await asyncHandler()
	}
	ready()
})
