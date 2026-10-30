import { MockError } from './errors'

export type MockDevState = {
  adminDeniedNextSignIn?: boolean
  adminNextSignInRejected?: boolean
  /** Admin: the next Activate/Renew license is saved but its reply is lost */
  adminNextLicenseSaveNoReply?: boolean
  /** Admin: the next approved contact change fails at the sign-in provider and needs a retry */
  adminNextContactApplicationFails?: boolean
  offline: boolean
  licenseExpired: boolean
  nextSaveFails: boolean
  nextSaveConflict: boolean
  syncFails?: boolean
  recordsMissing?: boolean
  originalDeviceLost?: boolean
  originalDeviceReconnects?: boolean
  secondDevice?: boolean
  downloadFails?: boolean
  authorizationExpired?: boolean
  activeFinishAllowed?: boolean
}
export const DEFAULT_DEV_STATE: MockDevState = {
  offline: false,
  licenseExpired: false,
  nextSaveFails: false,
  nextSaveConflict: false,
  syncFails: false,
  recordsMissing: false,
  originalDeviceLost: false,
  originalDeviceReconnects: false,
  secondDevice: false,
  downloadFails: false,
  authorizationExpired: false,
  activeFinishAllowed: true,
}
export type PlayerRankScenario =
  | 'on-leaderboard'
  | 'below-threshold'
  | 'needs-reassessment'
  | 'updating'
  | 'no-rank'
export type LeaderboardScenario = 'normal' | 'loading' | 'error' | 'empty'
export type PlayerMockDevState = MockDevState & {
  playerRankScenario?: PlayerRankScenario
  leaderboardScenario?: LeaderboardScenario
}
let read: () => PlayerMockDevState = () => DEFAULT_DEV_STATE
type ConsumableToggle =
  | 'nextSaveFails'
  | 'nextSaveConflict'
  | 'adminDeniedNextSignIn'
  | 'adminNextSignInRejected'
  | 'adminNextLicenseSaveNoReply'
  | 'adminNextContactApplicationFails'
let consume = (_key: ConsumableToggle) => {}
const listeners = new Set<() => void>()
const saveFailureListeners = new Set<() => void>()
export function subscribeMockSaveFailure(listener: () => void) {
  saveFailureListeners.add(listener)
  return () => {
    saveFailureListeners.delete(listener)
  }
}

/** App-owned Redux supplies the adapter; the data package never imports an app. */
export function connectMockBridge(adapter: {
  read: () => PlayerMockDevState
  consume: typeof consume
}) {
  read = adapter.read
  consume = adapter.consume
  return () => {
    read = () => DEFAULT_DEV_STATE
    consume = () => {}
    notifyMockBridge()
  }
}
export function getMockDevState(): PlayerMockDevState {
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
    for (const listener of saveFailureListeners) listener()
    throw new MockError('retryable', 'Changes could not be saved')
  }
  if (read().nextSaveConflict) {
    consume('nextSaveConflict')
    throw new MockError('conflict', 'Something changed. Review and try again.')
  }
}

/** One-shot developer scenarios are reset in the app-owned Redux bridge. */
export function consumeMockDevToggle(key: ConsumableToggle) {
  if (!read()[key]) return false
  consume(key)
  return true
}
