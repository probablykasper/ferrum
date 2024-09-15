/* tslint:disable */
/* eslint-disable */

export * from './addon.d'

declare module 'ferrum-addon/addon' {
	export type TrackID = string
	export type TrackListID = string
	export type PercentInteger = number
	export type MsSinceUnixEpoch = number

	export interface Playlist {
		type: 'playlist'
	}
	export interface Folder {
		type: 'folder'
	}
	export interface Special {
		type: 'special'
	}

	export type TrackList = Playlist | Folder | Special
}
