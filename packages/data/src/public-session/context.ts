import { pairedQueuePlayerOrigins } from '../app-origins'

/**
 * Canonical same-site deployment plus local development (and a configured pair, see app-origins);
 * no wildcard preview origins.
 */
const PAIRED = pairedQueuePlayerOrigins()
export const QUEUE_ORIGINS = PAIRED.queue
export const PLAYER_ORIGINS = PAIRED.player

/** Only a public session and its three UI parameters (join, tab, invite) may cross the app boundary. */
export function queueSessionUrl(value: string | undefined): string | null {
  if (!value || value.includes('\\')) return null
  try {
    const url = new URL(value)
    if (!QUEUE_ORIGINS.includes(url.origin) || !/^\/s\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname))
      return null
    const clean = new URL(url.pathname, url.origin)
    if (url.searchParams.get('join') === '1') clean.searchParams.set('join', '1')
    const tab = url.searchParams.get('tab')
    if (tab === 'details' || tab === 'participants') clean.searchParams.set('tab', tab)
    // A Session invite code (8 letters or digits) rides along so it survives the login round trip.
    const invite = url.searchParams.get('invite')
    if (invite && /^[A-Za-z0-9]{8}$/.test(invite)) clean.searchParams.set('invite', invite)
    return clean.href
  } catch {
    return null
  }
}

export function playerOrigin(queueOrigin: string) {
  return QUEUE_ORIGINS.includes(queueOrigin)
    ? (PLAYER_ORIGINS[QUEUE_ORIGINS.indexOf(queueOrigin)] ?? null)
    : null
}

const RETURN_KEY = 'rotra-player-session-return'
const MAX_AGE = 30 * 60_000

/** UI context only; never auth tokens, credentials, identity or admission evidence. */
export function rememberSessionReturn(value: string | undefined) {
  const url = queueSessionUrl(value)
  if (!url || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({ url, at: Date.now() }))
  } catch {
    /* Browser storage may be disabled. Explicit next still works. */
  }
}

/** Registration invitations opened in the same tab retain the pending session destination. */
export function sessionReturn(value?: string) {
  const explicit = queueSessionUrl(value)
  if (explicit) return explicit
  if (value !== undefined) return null
  if (typeof sessionStorage === 'undefined') return null
  try {
    const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) ?? 'null')
    if (
      !saved ||
      typeof saved.at !== 'number' ||
      Date.now() < saved.at ||
      Date.now() - saved.at >= MAX_AGE
    ) {
      sessionStorage.removeItem(RETURN_KEY)
      return null
    }
    return queueSessionUrl(saved.url)
  } catch {
    return null
  }
}

export function consumeSessionReturn(value?: string) {
  const url = sessionReturn(value)
  try {
    sessionStorage.removeItem(RETURN_KEY)
  } catch {
    /* optional UI memory */
  }
  return url
}

/**
 * Register with ROTRA (D-2026-11-09-06, #689): the Player app's registration form under the
 * session's club, with the session for its title and the way back (`?join=1`).
 */
export function playerRegisterUrl(clubId: string, returnTo: string) {
  const back = queueSessionUrl(returnTo)
  if (!back) return undefined
  const url = new URL(back)
  const origin = playerOrigin(url.origin)
  if (!origin) return undefined
  url.searchParams.set('join', '1')
  const register = new URL(`/register/${encodeURIComponent(clubId)}`, origin)
  register.searchParams.set('session', url.pathname.split('/')[2] ?? '')
  register.searchParams.set('next', url.href)
  return register.href
}

export function playerLoginUrl(returnTo: string) {
  const back = queueSessionUrl(returnTo)
  if (!back) return undefined
  const origin = playerOrigin(new URL(back).origin)
  if (!origin) return undefined
  const login = new URL('/login', origin)
  login.searchParams.set('next', back)
  return login.href
}
