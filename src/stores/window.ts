import type { Data } from './data'

type addon = {
  copy_file: Function
  atomic_file_save: Function
  load_data: (isDev: boolean) => Data
}
declare global {
  interface Window {
    addon: addon
    showMessageBoxSync: Function
    readyToQuit: Function
    toFileUrl: (...args: string[]) => string
    existsSync: (path: string) => boolean
  }
}

export default window
