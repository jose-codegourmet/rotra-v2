import 'server-only'
import {
  cancelBlocker,
  cancelReasonError,
  cancelReasonOf,
} from '@rotra/data/queue-session/queueSession.rules'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { ServiceError } from '../service/errors'
import { sessionDto } from './dto'
import { lockSession, mapDatabaseError, requireSessionAccess } from './session-store'

/**
 * Q-PREPARE / D-CANCEL-SESSION: calls off one prepared session. Final; needs internet (never
 * queued offline, no sync replay). Sets `cancelled`, `cancelled_at` and `cancel_reason`, and closes
 * the pending join requests in the same transaction. Roster, waitlist and payment marks stay,
 * read-only; no refund is recorded. The offline-start reservation is released, since the session
 * can never start. Repeat-safe: a retry on a session already cancelled returns it unchanged.
 */
export async function cancelSession(
  context: ClubContext,
  sessionId: string,
  reason: string | null,
) {
  const reasonError = cancelReasonError(reason)
  if (reasonError) throw new ServiceError('invalid', { reason: reasonError })
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, context, sessionId)
      if (session.state === 'cancelled') return sessionDto(session)
      await requireSessionAccess(context, session)
      const blocker = cancelBlocker(session)
      // Started meanwhile (or otherwise past prepared): nothing changes.
      if (blocker) throw new ServiceError('conflict', { state: blocker })
      const now = new Date()
      await tx.sessionJoinRequest.updateMany({
        where: { clubId: context.clubId, sessionId, status: 'pending' },
        data: { status: 'closed', decidedAt: now },
      })
      await tx.clubSessionReservation.deleteMany({ where: { clubId: context.clubId, sessionId } })
      const updated = await tx.queueSession.update({
        where: { id: sessionId },
        data: {
          state: 'cancelled',
          cancelledAt: now,
          cancelReason: cancelReasonOf(reason),
          revision: { increment: 1 },
        },
      })
      return sessionDto(updated)
    })
  } catch (error) {
    mapDatabaseError(error)
  }
}
