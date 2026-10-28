import { mockCookieName } from '../auth/cookie'
import type { AdminSession } from './adminAccount.types'

export const ADMIN_COOKIE_NAME = mockCookieName('admin')
/** Mock-only marker; this does not establish real authentication or authorization. */
export function parseAdminSession(raw: string | undefined): AdminSession {
  const signedOut: AdminSession = { kind: 'signed-out', sessionEnded: false }
  if (!raw) return signedOut
  try {
    const value: unknown = JSON.parse(decodeURIComponent(raw))
    if (!value || typeof value !== 'object' || !('kind' in value)) return signedOut
    if (value.kind === 'signed-out') return { kind: 'signed-out', sessionEnded: 'sessionEnded' in value && value.sessionEnded === true }
    if (value.kind === 'denied' && 'accountDescription' in value && typeof value.accountDescription === 'string') return { kind: 'denied', accountDescription: value.accountDescription }
    if (value.kind === 'owner' && 'account' in value && value.account && typeof value.account === 'object' && 'id' in value.account && 'email' in value.account && typeof value.account.id === 'string' && typeof value.account.email === 'string' && value.account.id && value.account.email) return { kind: 'owner', account: { id: value.account.id, email: value.account.email } }
  } catch { /* A malformed or obsolete marker is signed out. */ }
  return signedOut
}
export function readAdminSessionMarker() {
  if (typeof document === 'undefined') return ''
  const prefix = `${ADMIN_COOKIE_NAME}=`
  return document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix))?.slice(prefix.length) ?? ''
}
