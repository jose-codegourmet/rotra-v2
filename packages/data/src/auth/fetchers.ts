import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { players } from '../fixtures/players'
import { phoneField } from '@rotra/schema/phone'
import { readMockState } from '../mock/store'
import { getMockDevState, requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import type { AuthAudience, MockSession, SignInInput } from './auth.types'
import { mockCookieName, parseMockSession } from './cookie'

const passwords = new Map<AuthAudience, string>()
function readSession(audience: AuthAudience) {
  if (typeof document === 'undefined') return null
  const name = `${mockCookieName(audience)}=`
  return parseMockSession(
    document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith(name))
      ?.slice(name.length),
    audience,
  )
}
export async function getSession(audience: AuthAudience): Promise<MockSession | null> {
  return readSession(audience)
}
/** Mock players match a claimed fixture; club/Admin use nonempty demo credentials. No network auth. */
export async function signIn(audience: AuthAudience, input: SignInInput): Promise<MockSession> {
  await delay()
  if (audience === 'player' && getMockDevState().offline)
    throw new MockError('offline', "You're offline. Signing in needs an internet connection.")
  requireOnline()
  if (!input.identifier.trim() || !input.password)
    throw new MockError('permission', 'Enter your sign-in details.')
  if (typeof document === 'undefined')
    throw new MockError('permission', 'Mock sign-in needs a browser.')
  let player = players.find((entry) => entry.nickname === 'Migs')
  // The developer-menu shortcut remains separate from the real form's phone/email inputs.
  if (audience === 'player' && input.identifier !== 'demo') {
    const identifier = input.identifier.trim().toLowerCase()
    const phone = phoneField.safeParse(identifier)
    const account = readMockState().playerAccounts.find((entry) => entry.claimed &&
      ((phone.success && entry.phone === phone.data) || (entry.email && entry.email.toLowerCase() === identifier)))
    player = account ? players.find((entry) => entry.id === account.playerId) : undefined
    if (!player) throw new MockError('permission', "That phone number or email and password don't match. Check them and try again.")
  }
  if (!player) throw new Error('Missing mock account fixture.')
  const account =
    audience === 'club'
      ? { id: DEMO_CLUB_ID, name: 'Lahug Smash Club', audience }
      : audience === 'player'
        ? { id: player.id, name: player.fullName, audience }
        : { id: 'platform-owner', name: 'Platform owner', audience }
  const session = { account }
  // biome-ignore lint/suspicious/noDocumentCookie: browser-readable mock marker explicitly required by F06.4
  document.cookie = `${mockCookieName(audience)}=${encodeURIComponent(JSON.stringify(session))}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
  if (audience !== 'player') passwords.set(audience, input.password)
  return session
}
export async function signOut(audience: AuthAudience) {
  if (typeof document !== 'undefined') {
    // biome-ignore lint/suspicious/noDocumentCookie: remove the F06.4 mock session marker
    document.cookie = `${mockCookieName(audience)}=; Path=/; Max-Age=0; SameSite=Lax`
  }
  passwords.delete(audience)
  return null
}
/** Password stays in memory only. After reload, sign in again before changing the mock password. */
export function validateMockClubPassword(current: string, next: string) {
  requireOnline()
  if (!readSession('club') || passwords.get('club') !== current)
    throw new MockError('permission', "That isn't your current password.", {
      current: "That isn't your current password.",
    })
  if (!next)
    throw new MockError('permission', 'Enter a new password.', { next: 'Enter a new password.' })
}
export function applyMockClubPassword(next: string) {
  passwords.set('club', next)
}
