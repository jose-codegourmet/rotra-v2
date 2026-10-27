import { MockError } from './errors'

export type MockDevState = {
  offline: boolean
  licenseExpired: boolean
  nextSaveFails: boolean
  nextSaveConflict: boolean
}
export const DEFAULT_DEV_STATE: MockDevState = {
  offline: false,
  licenseExpired: false,
  nextSaveFails: false,
  nextSaveConflict: false,
}
let read = () => DEFAULT_DEV_STATE
let consume = (_key: 'nextSaveFails' | 'nextSaveConflict') => {}
const listeners = new Set<() => void>()

/** App-owned Redux supplies the adapter; the data package never imports an app. */
export function connectMockBridge(adapter: { read: () => MockDevState; consume: typeof consume }) {
  read = adapter.read
  consume = adapter.consume
  return () => {
    read = () => DEFAULT_DEV_STATE
    consume = () => {}
    notifyMockBridge()
  }
}
export function getMockDevState(): MockDevState {
  return read()
}
export function notifyMockBridge() {
  for (const listener of listeners) listener()
}
export function subscribeMockBridge(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function requireOnline() {
  if (read().offline) throw new MockError('offline', "You're offline. Reconnect and try again.")
}
/** Consumed at commit time, before any store write; a rejected write leaves state intact. */
export function checkMockSave() {
  if (read().nextSaveFails) {
    consume('nextSaveFails')
    throw new MockError('retryable', 'Changes could not be saved')
  }
  if (read().nextSaveConflict) {
    consume('nextSaveConflict')
    throw new MockError('conflict', 'Something changed. Review and try again.')
  }
}
