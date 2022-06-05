import type { Data } from './data'
import type { MessageBoxOptions, OpenDialogOptions } from 'electron'
const electron = window.require('electron')

export const ipcRenderer = electron.ipcRenderer

const invoke = ipcRenderer.invoke

type addon = {
  copy_file: Function
  atomic_file_save: Function
  load_data: (isDev: boolean) => Data
  load_data_async: (isDev: boolean) => Promise<Data>
}
declare global {
  interface Window {
    addon: addon
    toFileUrl: (...args: string[]) => string
    iTunesImport: Function
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
export const toFileUrl = window.toFileUrl
