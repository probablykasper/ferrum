import type {
  IpcMain as ElectronIpcMain,
  IpcMainEvent,
  IpcMainInvokeEvent as ElectronIpcMainInvokeEvent,
  IpcRenderer as ElectronIpcRenderer,
  IpcRendererEvent,
  WebContents as ElectronWebContents,
  dialog,
} from 'electron'
import type { TrackID } from 'ferrum-addon'

type OptionalPromise<T> = T | Promise<T>
type InputMap = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => any
}

interface TypedWebContents<IpcEvents extends InputMap> extends ElectronWebContents {
  send<K extends keyof IpcEvents>(channel: K, ...args: Parameters<IpcEvents[K]>): void
}

interface TypedIpcMainInvokeEvent<IpcEvents extends InputMap> extends ElectronIpcMainInvokeEvent {
  sender: TypedWebContents<IpcEvents>
}

interface TypedIpcMain<IpcEvents extends InputMap, IpcCommands extends InputMap>
  extends ElectronIpcMain {
  on<K extends keyof IpcEvents>(
    channel: K,
    listener: (event: IpcMainEvent, ...args: Parameters<IpcEvents[K]>) => void
  ): this
  once<K extends keyof IpcEvents>(
    channel: K,
    listener: (event: IpcMainEvent, ...args: Parameters<IpcEvents[K]>) => void
  ): this
  removeListener<K extends keyof IpcEvents>(
    channel: K,
    listener: (event: IpcMainEvent, ...args: Parameters<IpcEvents[K]>) => void
  ): this
  removeAllListeners<K extends keyof IpcEvents>(channel?: K): this
  handle<K extends keyof IpcCommands>(
    channel: K,
    listener: (
      event: TypedIpcMainInvokeEvent<IpcEvents>,
      ...args: Parameters<IpcCommands[K]>
    ) => OptionalPromise<ReturnType<IpcCommands[K]>>
  ): void
  handleOnce<K extends keyof IpcCommands>(
    channel: K,
    listener: (
      event: TypedIpcMainInvokeEvent<IpcEvents>,
      ...args: Parameters<IpcCommands[K]>
    ) => OptionalPromise<ReturnType<IpcCommands[K]>>
  ): void
  removeHandler<K extends keyof IpcCommands>(channel: K): void
}

interface TypedIpcRenderer<IpcEvents extends InputMap, IpcCommands extends InputMap>
  extends ElectronIpcRenderer {
  on<K extends keyof IpcEvents>(
    channel: K,
    listener: (event: IpcRendererEvent, ...args: Parameters<IpcEvents[K]>) => void
  ): this
  once<K extends keyof IpcEvents>(
    channel: K,
    listener: (event: IpcRendererEvent, ...args: Parameters<IpcEvents[K]>) => void
  ): this
  removeListener<K extends keyof IpcEvents>(
    channel: K,
    listener: (event: IpcRendererEvent, ...args: Parameters<IpcEvents[K]>) => void
  ): this
  removeAllListeners<K extends keyof IpcEvents>(channel: K): this
  send<K extends keyof IpcEvents>(channel: K, ...args: Parameters<IpcEvents[K]>): void
  sendSync<K extends keyof IpcEvents>(
    channel: K,
    ...args: Parameters<IpcEvents[K]>
  ): ReturnType<IpcEvents[K]>
  sendTo<K extends keyof IpcEvents>(
    webContentsId: number,
    channel: K,
    ...args: Parameters<IpcEvents[K]>
  ): void
  sendToHost<K extends keyof IpcEvents>(channel: K, ...args: Parameters<IpcEvents[K]>): void
  invoke<K extends keyof IpcCommands>(
    channel: K,
    ...args: Parameters<IpcCommands[K]>
  ): Promise<ReturnType<IpcCommands[K]>>
}

type Events = {
  newPlaylist: (id: string, isFolder: boolean) => void
  itunesImport: () => void
  import: () => void
  filter: () => void

  playPause: () => void
  volumeUp: () => void
  volumeDown: () => void
  'Toggle Queue': () => void

  selectedTracksAction: (
    action:
      | 'Play Next'
      | 'Add to Queue'
      | 'Get Info'
      | 'revealTrackFile'
      | 'Remove from Playlist'
      | 'Delete from Library'
  ) => void

  'context.playlist.edit': (id: TrackID) => void
  'context.Remove from Queue': () => void
  'context.Play Next': (ids: TrackID[]) => void
  'context.Add to Queue': (ids: TrackID[]) => void
  'context.Add to Playlist': (id: string, trackIds: TrackID[]) => void
  'context.revealTrackFile': (id: TrackID) => void
  'context.Get Info': (allIds: TrackID[], selectedIndex: number) => void
  'context.Remove from Playlist': (selectedIndexes: number[]) => void
}

export type ShowTrackMenuOptions = {
  allIds: string[]
  selectedIndexes: number[]
  playlist?: { editable: boolean }
  lists: { label: string; enabled: boolean; id: string }[]
  queue: boolean
}

type Commands = {
  showMessageBox: (
    attached: boolean,
    options: Parameters<typeof dialog.showMessageBox>[0]
  ) => ReturnType<typeof dialog.showMessageBox>
  showOpenDialog: (
    attached: boolean,
    options: Parameters<typeof dialog.showOpenDialog>[0]
  ) => ReturnType<typeof dialog.showOpenDialog>
  revealTrackFile: (...paths: string[]) => void
  showTrackMenu: (options: ShowTrackMenuOptions) => void
  showTracklistMenu: (options: { id: string; isFolder: boolean; isRoot: boolean }) => void
}

export type IpcMain = TypedIpcMain<Events, Commands>
export type IpcRenderer = TypedIpcRenderer<Events, Commands>
export type WebContents = TypedWebContents<Events>

// export type IpcListen<K extends keyof Events> = () => () => void
// on<K extends keyof IpcEvents>(
//     channel: K,
//     listener: (event: IpcRendererEvent, ...args: Parameters<IpcEvents[K]>) => void
//   )

// interface IpcFunctions<IpcEvents extends InputMap> {
//   IpcListen<K extends keyof IpcEvents>(
//     channel: K,
//     listener: (event: IpcRendererEvent, ...args: Parameters<IpcEvents[K]>) => void
//   ): () => void
// }
// export type IpcListen = IpcFunctions<Events>

// export type IpcListen<E extends Events, K extends keyof E> = (
//   channel: K,
//   listener: (event: IpcRendererEvent, ...args: Parameters<E[K]>) => void
// ): () => void

interface TypedIpcFunctions<IpcEvents extends InputMap> extends ElectronIpcRenderer {
  ipcListen<K extends keyof IpcEvents>(
    channel: K,
    listener: (event: IpcRendererEvent, ...args: Parameters<IpcEvents[K]>) => void
  ): () => void
}
export type IpcFunctions = TypedIpcFunctions<Events>
