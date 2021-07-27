import type { Folder, Special, TrackListsHashMap } from '../stores/libraryTypes'

export function getDuration(dur: number) {
  dur = Math.round(dur)
  let secs = dur % 60
  let secsText = String(secs)
  if (secs < 10) secsText = '0' + secs
  const mins = (dur - secs) / 60
  return mins + ':' + secsText
}

export function formatDate(timestamp: number) {
  const date = new Date(timestamp)
  const month = date.getMonth() + 1
  const monthText = (month < 10 ? '0' : '') + month
  const day = date.getDate()
  const dayText = (day < 10 ? '0' : '') + day
  let hours = date.getHours()
  const mins = date.getMinutes()
  const minsText = (mins < 10 ? '0' : '') + mins
  let ampm = 'AM'
  if (hours > 11) {
    hours -= 12
    ampm = 'PM'
  }
  if (hours === 0) hours = 12
  return (
    date.getFullYear() + '/' + monthText + '/' + dayText + ' ' + hours + ':' + minsText + ' ' + ampm
  )
}

type ShortcutOptions = {
  shift?: boolean
  alt?: boolean
  cmdOrCtrl?: boolean
}
const isMac = navigator.userAgent.indexOf('Mac') != -1

function checkModifiers(e: KeyboardEvent | MouseEvent, options: ShortcutOptions) {
  const target = {
    shift: options.shift || false,
    alt: options.alt || false,
    ctrl: (!isMac && options.cmdOrCtrl) || false,
    meta: (isMac && options.cmdOrCtrl) || false,
  }

  const pressed = {
    shift: !!e.shiftKey,
    alt: !!e.altKey,
    ctrl: !!e.ctrlKey,
    meta: !!e.metaKey,
  }

  return (
    pressed.shift === target.shift &&
    pressed.alt === target.alt &&
    pressed.ctrl === target.ctrl &&
    pressed.meta === target.meta
  )
}

export function checkShortcut(e: KeyboardEvent, key: string, options: ShortcutOptions = {}) {
  if (e.key.toUpperCase() !== key.toUpperCase()) return false
  return checkModifiers(e, options)
}
export function checkMouseShortcut(e: MouseEvent, options: ShortcutOptions = {}) {
  return checkModifiers(e, options)
}

export function clamp(min: number, max: number, value: number) {
  if (value < 0) return min
  if (value > 1) return max
  return value
}

export function flattenChildLists(
  trackList: Folder | Special,
  trackLists: TrackListsHashMap,
  prefix: string,
  idPrefix: string
) {
  type Item = { label: string; enabled: boolean; id?: string }
  let flat: Item[] = []
  for (const childListId of trackList.children) {
    const childList = trackLists[childListId]
    if (childList.type === 'folder') {
      const childFlat = flattenChildLists(childList, trackLists, prefix + '   ', idPrefix)
      flat.push({
        label: prefix + childList.name,
        enabled: false,
      })
      flat = flat.concat(childFlat)
    } else if (childList.type === 'playlist') {
      flat.push({
        label: prefix + childList.name,
        enabled: true,
        id: idPrefix + childList.id,
      })
    }
  }
  return flat
}

let lastActiveElement = document.body
export function focus(el: HTMLElement) {
  if (document.activeElement instanceof HTMLElement) {
    lastActiveElement = document.activeElement
    el.focus()
  }
}
export function focusLast() {
  if (lastActiveElement) lastActiveElement.focus()
}
