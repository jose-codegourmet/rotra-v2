import 'server-only'
import type { MatchFormat } from '@rotra/data/match/types'
import type { MatchRequest } from '@rotra/data/match-request/types'
import type { SessionMatchRequest, SessionMatchRequestSpot } from '../generated/prisma/client'
import { LIVE_ENTRY, type Tx } from './session-store'

/**
 * Storage helpers for match requests (D-2026-11-09-05) that other queue commands call inside their
 * own transaction: the auto-close after a presence or roster change, and the close at session end.
 * No imports from the match commands, so roster, finalization and cancel can use them.
 */

export type MatchRequestRow = SessionMatchRequest & { spots: SessionMatchRequestSpot[] }

export const MATCH_REQUEST_INCLUDE = { spots: true } as const

/** The shared rule shape: roster ids, one entry per spot in slot order, `null` = Anyone. */
export function requestShape(
  row: MatchRequestRow,
): Pick<MatchRequest, 'pid' | 'format' | 'partners' | 'opponents'> {
  const side = (name: 'partner' | 'opponent') =>
    row.spots
      .filter((s) => s.side === name)
      .sort((a, b) => a.slotNo - b.slotNo)
      .map((s) => s.sessionPlayerId)
  return {
    pid: row.sessionPlayerId,
    format: row.format as MatchFormat,
    partners: side('partner'),
    opponents: side('opponent'),
  }
}

/** Everyone a stored request names: the requester and every picked spot. */
export const namedIds = (row: MatchRequestRow) =>
  [row.sessionPlayerId, ...row.spots.map((s) => s.sessionPlayerId)].filter(
    (id): id is string => !!id,
  )

/** Ids of the session's live roster entries that are present right now. */
export async function presentIds(tx: Tx, sessionId: string) {
  const rows = await tx.sessionPlayer.findMany({
    where: { sessionId, ...LIVE_ENTRY, present: true },
    select: { id: true },
  })
  return new Set(rows.map((r) => r.id))
}

/**
 * Open requests whose named players are all still present, oldest first. A request naming anyone
 * who is not present (or no longer on the roster) is stale: it reads as closed even before
 * `closeStaleMatchRequests` persists that.
 */
export async function liveOpenRequests(tx: Tx, sessionId: string) {
  const [open, present] = await Promise.all([
    tx.sessionMatchRequest.findMany({
      where: { sessionId, status: 'open' },
      include: MATCH_REQUEST_INCLUDE,
      orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
    }),
    presentIds(tx, sessionId),
  ])
  return open.filter((r) => namedIds(r).every((id) => present.has(id)))
}

/**
 * The auto-close (D-2026-11-09-05): every open request in the session that names someone who
 * stopped being present, or left the roster, becomes `closed`. Run after any presence or roster
 * change; a request closed this way never reopens when the player comes back. Returns how many.
 */
export async function closeStaleMatchRequests(tx: Tx, sessionId: string, now = new Date()) {
  const [open, present] = await Promise.all([
    tx.sessionMatchRequest.findMany({
      where: { sessionId, status: 'open' },
      include: MATCH_REQUEST_INCLUDE,
    }),
    presentIds(tx, sessionId),
  ])
  const stale = open.filter((r) => namedIds(r).some((id) => !present.has(id))).map((r) => r.id)
  if (!stale.length) return 0
  const done = await tx.sessionMatchRequest.updateMany({
    where: { id: { in: stale }, status: 'open' },
    data: { status: 'closed', decidedAt: now, revision: { increment: 1 } },
  })
  return done.count
}

/** Finishing, invalidating or cancelling a session closes every open match request (kept, hidden). */
export async function closeSessionMatchRequests(tx: Tx, sessionId: string, now = new Date()) {
  const done = await tx.sessionMatchRequest.updateMany({
    where: { sessionId, status: 'open' },
    data: { status: 'closed', decidedAt: now, revision: { increment: 1 } },
  })
  return done.count
}
