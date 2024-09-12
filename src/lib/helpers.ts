import { type Updater, type Writable, writable } from 'svelte/store'
import type { TrackListDetails } from '../../ferrum-addon'

export function getDuration(dur: number) {
  dur = Math.round(dur)
  const secs = dur % 60
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
  const clock = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
  return date.getFullYear() + '/' + monthText + '/' + dayText + ' ' + clock
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

  const ignoreCtrl = isMac && e instanceof MouseEvent

  return (
    pressed.shift === target.shift &&
    pressed.alt === target.alt &&
    (pressed.ctrl === target.ctrl || ignoreCtrl) &&
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

type FlattenedListMenuItem = { label: string; enabled: boolean; id: string }
export function flattenChildLists(
  trackList: TrackListDetails,
  trackLists: Record<string, TrackListDetails>,
  indentPrefix: string,
) {
  let flat: FlattenedListMenuItem[] = []
  for (const childListId of trackList.children || []) {
    const childList = trackLists[childListId]
    if (childList.kind === 'folder') {
      const childFlat = flattenChildLists(childList, trackLists, indentPrefix + '   ')
      flat.push({
        label: indentPrefix + childList.name,
        enabled: false,
        id: childList.id,
      })
      flat = flat.concat(childFlat)
    } else if (childList.kind === 'playlist') {
      flat.push({
        label: indentPrefix + childList.name,
        enabled: true,
        id: childList.id,
      })
    }
  }
  return flat
}

type GetterWritable<T> = Writable<T> & { get(): T }
export function getterWritable<T>(value: T): GetterWritable<T> {
  const { subscribe, set } = writable(value)
  return {
    subscribe: subscribe,
    set(newValue: T) {
      value = newValue
      set(newValue)
    },
    update(updater: Updater<T>) {
      value = updater(value)
      set(value)
    },
    get: () => value,
  }
}

export function assertUnreachable(x: never) {
  console.error('Unreachable reached', x)
}
