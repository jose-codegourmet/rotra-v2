import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { requireClubEntitlement } from '../service/authorize'
import { ServiceError } from '../service/errors'
import {
  liveRoster,
  lockSession,
  mapDatabaseError,
  requireSessionAccess,
  requireState,
} from './session-store'

/**
 * Q-PREPARE / D-DELETE-SESSION: removes one prepared session with nobody confirmed. Waitlist and
 * join requests do not block. Other dates in a series stay. Documented preparation data (courts,
 * waitlist, requests, estimate, released roster rows) go with it; previously synced evidence is
 * not inferred.
 */
export async function deleteSession(context: ClubContext, sessionId: string) {
  await requireClubEntitlement(context)
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, context, sessionId)
      await requireSessionAccess(context, session)
      requireState(session, ['prepared'], 'Only a session that has not started can be deleted.')
      const confirmed = (await liveRoster(tx, sessionId)).length
      if (confirmed)
        throw new ServiceError('conflict', {
          roster: `${confirmed} ${confirmed === 1 ? 'player is' : 'players are'} confirmed. Remove them from the roster first.`,
        })
      const { title } = session
      await tx.sessionWaitlistEntry.deleteMany({ where: { sessionId } })
      await tx.sessionJoinRequest.deleteMany({ where: { sessionId } })
      await tx.sessionPaymentMark.deleteMany({ where: { sessionId } })
      await tx.sessionShuttlePlanLine.deleteMany({ where: { sessionId } })
      await tx.sessionCostEstimate.deleteMany({ where: { sessionId } })
      await tx.sessionPlayer.updateMany({ where: { sessionId }, data: { assessmentId: null } })
      await tx.clubAssessment.updateMany({ where: { sessionId }, data: { supersedesId: null } })
      await tx.clubAssessment.deleteMany({ where: { sessionId } })
      await tx.sessionPlayer.deleteMany({ where: { sessionId } })
      await tx.clubSessionReservation.deleteMany({
        where: { clubId: context.clubId, sessionId },
      })
      await tx.sessionCourt.deleteMany({ where: { sessionId } })
      await tx.queueSession.delete({ where: { id: sessionId } })
      return { id: sessionId, title }
    })
  } catch (error) {
    mapDatabaseError(error)
  }
}
