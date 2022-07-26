type DragPlaylist = {
  id: string
  fromFolder: string
}

export const dragged = {
  tracks: {
    indexes: [] as number[],
    ids: [] as string[],
  },
  playlist: null as null | DragPlaylist,
}
