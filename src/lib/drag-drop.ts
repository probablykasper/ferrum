type DraggedTracks = {
  ids: string[]
  playlistIndexes?: number[]
  queueIndexes?: number[]
}
type DraggedPlaylist = {
  id: string
  fromFolder: string
  level: number
}

type Dragged = {
  tracks?: DraggedTracks
  playlist?: DraggedPlaylist
}
export const dragged: Dragged = {}
