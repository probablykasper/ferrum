import type { IpcRenderer, IpcFunctions } from '@/electron/typed_ipc'
import type Addon from 'ferrum-addon/addon'
const electron = window.require('electron')

export const ipcRenderer = electron.ipcRenderer as IpcRenderer

export const ipcListen: IpcFunctions['ipcListen'] = (channel, listener) => {
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

declare global {
  interface Window {
    addon: typeof Addon
    isDev: boolean
    isMac: boolean
    isWindows: boolean
    joinPaths: (...args: string[]) => string
  }
}

export const joinPaths = window.joinPaths
