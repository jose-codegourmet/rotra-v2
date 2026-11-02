import type {
  MyJoinRequest,
  PublicSessionPage,
  SendJoinRequestInput,
} from '../public-session/publicSession.types'
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
