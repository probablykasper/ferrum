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
    iTunesImport: (
      paths: { library_dir: string; tracks_dir: string; library_json: string },
      statusHandler: (status: string) => void,
      warningHandler: (status: string) => void
    ) => Promise<{ err?: Error; cancelled: boolean }>
  }
}

export const addon = window.addon
export const iTunesImport = window.iTunesImport
export const joinPaths = window.joinPaths
