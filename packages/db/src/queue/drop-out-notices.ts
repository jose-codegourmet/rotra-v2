import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { QueueSession } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { toIso } from '../service/serialize'
import { removeRosterPlayerIn } from './session-roster'
import {
  LIVE_ENTRY,
  lockSession,
  mapDatabaseError,
  recomputeMinimum,
  requireSessionAccess,
  rosterNamesOf,
  type Tx,
  touchSession,
} from './session-store'

/**
 * I can't make it, the Queue Master's side (D-2026-11-09-03), the same rules as the mock
 * (`@rotra/data/session-roster/requestDecisions`): the open notices a signed-in Player sent before
 * the start, read in Requests and closed by **Keep** (`kept`, the Player stays on the roster) or
 * **Remove from roster** (`removed`, the roster entry is released in the same transaction).
 * Finishing, invalidating or cancelling the session closes them with no decision
 * (`closeSessionMatchRequests`). The Player's own send lives with the other Player writes in
 * `public-session.ts`.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALREADY_CLOSED = 'This notice is already closed.'

/**
 * The session's open notices, oldest first, in the `DropOutNoticeView` shape with ISO times. A
 * notice whose roster entry is no longer live is left out, like the mock.
 */
export async function openDropOutNotices(tx: Tx, sessionId: string) {
  const notices = await tx.sessionDropOutNotice.findMany({
    where: { sessionId, status: 'open', entry: LIVE_ENTRY },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: { entry: { select: { nameSnapshot: true, clubPlayerId: true } } },
  })
  const names = await rosterNamesOf(
    tx,
    notices.map((n) => n.entry.clubPlayerId),
  )
  return notices.map((n) => ({
    id: n.id,
    sessionId: n.sessionId,
    pid: n.sessionPlayerId,
    playerId: n.playerId,
    at: toIso(n.createdAt),
    status: 'open' as const,
    decision: null,
    closedAt: null,
    name: n.entry.nameSnapshot,
    nickname: names.get(n.entry.clubPlayerId)?.nickname ?? null,
  }))
}

async function noticeCommand<T>(
  context: ClubContext,
  sessionId: string,
  noticeId: string,
  decide: (tx: Tx, session: QueueSession, notice: OpenNotice) => Promise<T>,
) {
  if (!UUID.test(noticeId)) throw new ServiceError('not_found')
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, context, sessionId)
      await requireSessionAccess(context, session, tx)
      const notice = await tx.sessionDropOutNotice.findFirst({
        where: { id: noticeId, sessionId },
        include: { entry: { select: { nameSnapshot: true, releasedAt: true } } },
      })
      if (!notice) throw new ServiceError('not_found')
      if (notice.status !== 'open' || notice.entry.releasedAt)
        throw new ServiceError('conflict', { notice: ALREADY_CLOSED })
      return decide(tx, session, notice)
    })
  } catch (error) {
    if (error instanceof ServiceError) throw error
    mapDatabaseError(error)
  }
}

type OpenNotice = {
  id: string
  sessionPlayerId: string
  entry: { nameSnapshot: string }
}

/** **Keep**: the notice closes as `kept`; the Player stays on the roster. */
export function keepDropOutNotice(context: ClubContext, sessionId: string, noticeId: string) {
  return noticeCommand(context, sessionId, noticeId, async (tx, _session, notice) => {
    await tx.sessionDropOutNotice.update({
      where: { id: notice.id },
      data: { status: 'closed', decision: 'kept', closedAt: new Date() },
    })
    return { noticeId: notice.id, name: notice.entry.nameSnapshot }
  })
}

/**
 * **Remove from roster**: the notice closes as `removed` and the roster entry is released (reason
 * `removed`, like a prepared roster's Remove) in one transaction. Notices are sent before the start,
 * so this is for a prepared session; once it is live the roster's own No show or Move to waitlist
 * applies instead and this is refused.
 */
export function removeDropOutNotice(context: ClubContext, sessionId: string, noticeId: string) {
  return noticeCommand(context, sessionId, noticeId, async (tx, session, notice) => {
    if (session.state !== 'prepared')
      throw new ServiceError('invalid', {
        state: 'The session has started. Use No show or Move to waitlist on the roster.',
      })
    await removeRosterPlayerIn(tx, session, notice.sessionPlayerId)
    await tx.sessionDropOutNotice.update({
      where: { id: notice.id },
      data: { status: 'closed', decision: 'removed', closedAt: new Date() },
    })
    await recomputeMinimum(tx, await touchSession(tx, session))
    return { noticeId: notice.id, name: notice.entry.nameSnapshot }
  })
}
