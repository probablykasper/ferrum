import type { MessageBoxOptions, OpenDialogOptions } from 'electron'
import type Addon from 'ferrum-addon/addon'
const electron = window.require('electron')

export const ipcRenderer = electron.ipcRenderer

const invoke = ipcRenderer.invoke

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

export async function showMessageBox(options: MessageBoxOptions) {
  type RV = Electron.MessageBoxReturnValue
  const result: RV = await invoke('showMessageBox', options)
  return {
    buttonClicked: result.response,
    checkboxChecked: result.checkboxChecked,
  }
}
export async function showMessageBoxAttached(attached: boolean, options: MessageBoxOptions) {
  type RV = Electron.MessageBoxReturnValue
  const result: RV = await invoke('showMessageBoxAttached', attached, options)
  return {
    buttonClicked: result.response,
    checkboxChecked: result.checkboxChecked,
  }
}
export async function showOpenDialog(attached: boolean, options: OpenDialogOptions) {
  type RV = Electron.OpenDialogReturnValue
  const result: RV = await invoke('showOpenDialog', attached, options)
  return result
}

export const addon = window.addon
export const iTunesImport = window.iTunesImport
export const joinPaths = window.joinPaths
