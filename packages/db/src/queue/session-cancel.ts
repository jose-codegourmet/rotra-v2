import 'server-only'
import {
  cancelBlocker,
  cancelReasonError,
  cancelReasonOf,
} from '@rotra/data/queue-session/queueSession.rules'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { appendLiveUpdateEvent } from '../live/append-event'
import { ServiceError } from '../service/errors'
import { sessionDto } from './dto'
import { closeSessionMatchRequests } from './match-request-store'
import { lockSession, mapDatabaseError, requireSessionAccess } from './session-store'
import { closePendingSlotTransfers } from './slot-transfers'

/**
 * Q-PREPARE / D-CANCEL-SESSION: calls off one prepared session. Final; needs internet (never
 * queued offline, no sync replay). Sets `cancelled`, `cancelled_at` and `cancel_reason`, and closes
 * the pending join requests in the same transaction. Roster, waitlist and payment marks stay,
 * read-only. Cancelling records no refund itself: afterwards the cancelled record lists everyone
 * who paid with the amount to hand back, and the Queue Master records each manual refund
 * (`recordSessionRefund`, #1014, owner decision 2026-11-22). Pending slot transfers are cancelled
 * here, which also ends their transfer links (a link works only while its transfer is pending,
 * #1012). The offline-start reservation is released, since the session
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
      await requireSessionAccess(context, session, tx)
      const blocker = cancelBlocker(session)
      // Started meanwhile (or otherwise past prepared): nothing changes.
      if (blocker) throw new ServiceError('conflict', { state: blocker })
      const now = new Date()
      await tx.sessionJoinRequest.updateMany({
        where: { clubId: context.clubId, sessionId, status: 'pending' },
        data: { status: 'closed', decidedAt: now },
      })
      await closeSessionMatchRequests(tx, sessionId, now)
      // #1011: pending slot transfers are cancelled with the session; slots and payments stay.
      await closePendingSlotTransfers(tx, sessionId, 'cancelled', now)
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
      await appendLiveUpdateEvent(tx, { clubId: context.clubId, sessionId, kind: 'session' })
      return sessionDto(updated)
    })
  } catch (error) {
    mapDatabaseError(error)
  }
}
