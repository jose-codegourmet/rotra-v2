import { adminAccount, nonAdminAccounts } from '../fixtures/adminAccounts'
import { consumeMockDevToggle, getMockDevState } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import type { AdminSession, AdminSignInInput } from './adminAccount.types'
import { ADMIN_COOKIE_NAME, parseAdminSession, readAdminSessionMarker } from './cookie'

export const ADMIN_OFFLINE_ERROR = "You're offline, so nothing was saved. Try again once you're connected."
/** All future Admin mutation fetchers call this before changing accepted data. */
export function requireAdminOnline() {
  if (getMockDevState().offline) throw new MockError('offline', ADMIN_OFFLINE_ERROR)
}
function writeSession(session: AdminSession) {
  if (typeof document === 'undefined') throw new MockError('permission', 'Mock sign-in needs a browser.')
  // biome-ignore lint/suspicious/noDocumentCookie: F06.4 browser-readable mock session marker
  document.cookie = `${ADMIN_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(session))}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
}
export async function getAdminSession(): Promise<AdminSession> {
  return parseAdminSession(readAdminSessionMarker())
}
/** Prototype reference: nonempty credentials accept the fixture owner; passwords are never stored. */
export async function signInAdmin(input: AdminSignInInput): Promise<AdminSession> {
  if (getMockDevState().offline) throw new MockError('offline', 'Signing in needs an internet connection.')
  await delay(400)
  if (getMockDevState().offline) throw new MockError('offline', 'Signing in needs an internet connection.')
  if (!input.email.trim() || !input.password) throw new MockError('permission', 'Enter your sign-in details.')
  if (process.env.NODE_ENV !== 'production' && consumeMockDevToggle('adminNextSignInRejected')) throw new MockError('permission', 'Email or password is incorrect.')
  const denied = process.env.NODE_ENV !== 'production' && consumeMockDevToggle('adminDeniedNextSignIn')
  const session: AdminSession = denied
    ? { kind: 'denied', accountDescription: nonAdminAccounts[0]?.accountDescription ?? '' }
    : { kind: 'owner', account: { ...adminAccount } }
  writeSession(session)
  return session
}
export async function signOutAdmin(input?: { sessionEnded?: boolean }): Promise<AdminSession> {
  const session: AdminSession = { kind: 'signed-out', sessionEnded: input?.sessionEnded === true }
  // Local sign-out and simulated expiry must work even while offline.
  writeSession(session)
  return session
}
