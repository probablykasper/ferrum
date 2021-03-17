import type { TrackID } from './libraryTypes'

let queue: TrackID[] = []
let currentIndex = 0
let userQueueLength = 1

const getCurrent = () => queue[currentIndex]
const getPrevious = () => queue[currentIndex - 1]
const getNext = () => queue[currentIndex + 1]

function prependToUserQueue(trackIds: TrackID[]) {
  queue.splice(currentIndex + 1, 0, ...trackIds)
  userQueueLength += trackIds.length
}
function appendToUserQueue(trackIds: TrackID[]) {
  queue.splice(currentIndex + userQueueLength + 1, 0, ...trackIds)
  userQueueLength += trackIds.length
}

function next() {
  if (currentIndex < queue.length) currentIndex += 1
  if (userQueueLength > 0) userQueueLength -= 1
}
function prev() {
  if (currentIndex > 0) {
    currentIndex -= 1
    userQueueLength += 1
  }
}

// TODO: Preserve userQueue when setting a new queue. Before we do that, we need the ability to see and clear the userQueue.
function setNewQueue(newIds: TrackID[], newCurrentIndex: number) {
  queue = newIds
  currentIndex = newCurrentIndex
  userQueueLength = 0
}

export default {
  getCurrent,
  getPrevious,
  getNext,
  prependToUserQueue,
  appendToUserQueue,
  next,
  prev,
  setNewQueue,
}

// var logState = () => console.log(queue, {currentIndex, userQueueLength, current: getCurrent(), isFirstIndex: isFirstIndex(), isLastIndex: isLastIndex()})
// logState()
// addToUserQueue('X'); logState()
// addToUserQueue('Y'); logState()
// setNewQueue([5,6], 0); logState()
