import { playerOrigin } from '../public-session/context'
import type {
  MyJoinRequest,
  PublicSessionPage,
  SendJoinRequestInput,
} from '../public-session/publicSession.types'
import type { JoinRequestPlacement } from '../session-roster/sessionRoster.types'
import { saveToastText } from '../sync/fetchers'
import type { SaveOutcome } from '../sync/sync.types'
import { realRequest } from './client'

// ---------- Public session (Q-PUBLIC-*), no account ----------

const base = (slug: string) => `/api/public-sessions/${encodeURIComponent(slug)}`

/**
 * The allowlisted page, already in the `PublicSessionPage` shape (epoch-ms times, published
 * slides only). A 404 stays a `RealRequestError`; the fetcher turns it into
 * `PublicSessionNotFoundError`.
 */
export function realGetPublicSession(slug: string) {
  return realRequest<PublicSessionPage>(base(slug))
}

/**
 * Request to join. `requestId` is the sheet's stable ID, so a retry with the same fields returns
 * the same request. The server keeps the visitor's receipt in an httpOnly cookie.
 */
export async function realSendJoinRequest(
  slug: string,
  input: SendJoinRequestInput,
): Promise<SaveOutcome & { data: { requestId: string } }> {
  const mine = await realRequest<MyJoinRequest>(`${base(slug)}/join-request`, {
    method: 'POST',
    body: {
      requestId: input.requestId ?? crypto.randomUUID(),
      name: input.name,
      nickname: input.nickname ?? null,
      phone: input.phone ?? null,
      statedBand: input.statedBand,
      placement: input.placement ?? 'slot',
    },
  })
  return {
    savedOffline: false,
    message: saveToastText('Request sent', { savedOffline: false }),
    data: { requestId: mine.requestId },
  }
}

/** This browser's own request (from its receipt cookie), or null when it holds none. */
export function realGetMyJoinRequest(slug: string) {
  return realRequest<MyJoinRequest | null>(`${base(slug)}/my-request`)
}

// ---------- Signed-in ROTRA Player on the session page (#687), on the Player origin ----------

/**
 * **Request to join as NAME** / **Cancel request**: credentialed calls to the Player app, which
 * reads the Player's own sign-in. No Player token or cookie is ever copied into the Queue app.
 */
async function playerPost<T>(slug: string, action: string, body: Record<string, unknown>) {
  const origin = typeof location === 'undefined' ? null : playerOrigin(location.origin)
  if (!origin) throw new Error('Sign in with ROTRA Player to send a request.')
  return realRequest<T>(`${origin}${base(slug)}/${action}`, {
    method: 'POST',
    body,
    credentials: 'include',
  })
}
async function playerSessionWrite(
  slug: string,
  action: 'join' | 'cancel',
  body: Record<string, unknown> = {},
) {
  const done = await playerPost<{ requestId: string; message: string }>(slug, action, body)
  return { savedOffline: false, message: done.message, data: { requestId: done.requestId } }
}

/** The body carries the player's choice (D-2026-11-11-02): slot, waitlist or from_waitlist. */
export const realJoinAsPlayer = (slug: string, placement: JoinRequestPlacement = 'slot') =>
  playerSessionWrite(slug, 'join', { placement })
export const realCancelMyJoinRequest = (slug: string) => playerSessionWrite(slug, 'cancel')

/**
 * **Move me to the waitlist** (#735): the signed-in Player's own step-down, on the Player origin
 * like Request to join. One `operationId` per tap, so a retry repeats nothing. A 409 carries
 * “You're in a match. Ask the Queue Master to finish or remove it first.” for the toast.
 */
export async function realMoveMeToWaitlist(slug: string) {
  const done = await playerPost<{ clubPlayerId: string; message: string }>(slug, 'step-down', {
    operationId: crypto.randomUUID(),
  })
  return { savedOffline: false, message: done.message, data: { clubPlayerId: done.clubPlayerId } }
}

/**
 * **Sign out** from the session page's account bar (#693): signs the Player out of ROTRA Player on
 * this device. A credentialed call to the Player app, like Request to join.
 */
export async function realSignOutOnSessionPage(slug: string) {
  const origin = typeof location === 'undefined' ? null : playerOrigin(location.origin)
  if (!origin) return null
  await realRequest<null>(`${origin}${base(slug)}/sign-out`, {
    method: 'POST',
    body: {},
    credentials: 'include',
  })
  return null
}
