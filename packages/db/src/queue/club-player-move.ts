import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { normalizeEmail, resolveEmail, savedRecordFor } from '../player/shared-entry'
import { requireClubEntitlement } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { LIVE_ENTRY } from './session-store'

const NOT_AVAILABLE = 'Player not available.'
/** Mock mode's placeholder copy (`MOVE_SAME_SESSION_MESSAGE`), kept word for word. */
const SAME_SESSION =
  'Both players are in a match in the same session. Finish or remove one of them there first.'

/**
 * The Same person step (D-2026-11-16-04, rotra-queue.html mergePlayer()): the email typed in Edit
 * details for a guest (or an older record with no email) already belongs to another saved player of
 * this club, and the Queue Master confirmed "Same person as NAME?". One transaction; the email must
 * be that player's (it is not a free link).
 *
 * Moved to the other record: live slots in prepared and active sessions (taking that player's
 * name), waitlist spots and pending join requests. Where both hold a live slot in one session the
 * move is refused (no slot is dropped: payments, games and requests hang on the slot). Finished
 * sessions, assessments, facts and summaries are append-only, so they stay on the moved record, which
 * is hidden with `removed_at` and points to the other through `linked_to_club_player_id`.
 */
export async function moveSavedPlayer(
  context: ClubContext,
  input: { clubPlayerId: string; intoClubPlayerId: string; email: string },
) {
  await requireClubEntitlement(context)
  const email = normalizeEmail(input.email)
  if (!email)
    throw new ServiceError('invalid', { email: 'Enter an email address, like name@example.com.' })
  return prisma.$transaction(async (tx) => {
    const now = new Date()
    const rows = await tx.clubPlayer.findMany({
      where: {
        clubId: context.clubId,
        id: { in: [input.clubPlayerId, input.intoClubPlayerId] },
        removedAt: null,
      },
      select: {
        id: true,
        playerId: true,
        sharedEntryId: true,
        displayName: true,
        player: { select: { fullName: true } },
      },
    })
    const moved = rows.find((r) => r.id === input.clubPlayerId)
    const target = rows.find((r) => r.id === input.intoClubPlayerId)
    if (!moved || !target || moved.id === target.id)
      throw new ServiceError('not_found', { player: NOT_AVAILABLE })
    if (moved.playerId || moved.sharedEntryId)
      throw new ServiceError('conflict', { player: 'This player already has an email on file.' })
    const resolution = await resolveEmail(tx, context.clubId, email, now, false)
    const same = resolution ? await savedRecordFor(tx, context.clubId, resolution, moved.id) : null
    if (same?.id !== target.id) throw new ServiceError('conflict', { player: NOT_AVAILABLE })
    const name = target.player?.fullName || target.displayName

    const live = await tx.sessionPlayer.findMany({
      where: {
        clubId: context.clubId,
        clubPlayerId: moved.id,
        session: { state: { in: ['prepared', 'active'] } },
      },
      select: { id: true, sessionId: true, releasedAt: true },
    })
    const targetSlots = await tx.sessionPlayer.findMany({
      where: {
        clubId: context.clubId,
        clubPlayerId: target.id,
        sessionId: { in: live.map((s) => s.sessionId) },
      },
      select: { sessionId: true, releasedAt: true },
    })
    for (const slot of live) {
      const kept = targetSlots.find((t) => t.sessionId === slot.sessionId)
      // One row per player per session (unique): a session both played in can't take this slot.
      if (kept) throw new ServiceError('conflict', { player: SAME_SESSION })
      await tx.sessionPlayer.update({
        where: { id: slot.id },
        data: {
          clubPlayerId: target.id,
          ...(slot.releasedAt ? {} : { nameSnapshot: name }),
          revision: { increment: 1 },
        },
      })
    }
    // One place per session: the other player's slot or spot wins over this record's spot.
    const spots = await tx.sessionWaitlistEntry.findMany({
      where: { clubId: context.clubId, clubPlayerId: moved.id },
      select: { id: true, sessionId: true },
    })
    for (const spot of spots) {
      const taken =
        (await tx.sessionWaitlistEntry.findFirst({
          where: { sessionId: spot.sessionId, clubPlayerId: target.id },
          select: { id: true },
        })) ??
        (await tx.sessionPlayer.findFirst({
          where: { sessionId: spot.sessionId, clubPlayerId: target.id, ...LIVE_ENTRY },
          select: { id: true },
        }))
      if (taken) await tx.sessionWaitlistEntry.delete({ where: { id: spot.id } })
      else
        await tx.sessionWaitlistEntry.update({
          where: { id: spot.id },
          data: { clubPlayerId: target.id },
        })
    }
    await tx.sessionJoinRequest.updateMany({
      where: { clubId: context.clubId, clubPlayerId: moved.id, status: 'pending' },
      data: { clubPlayerId: target.id, revision: { increment: 1 } },
    })
    await tx.clubPlayerClaimLink.updateMany({
      where: { clubId: context.clubId, clubPlayerId: moved.id, state: 'active' },
      data: { state: 'revoked', revokedAt: now, revision: { increment: 1 } },
    })
    await tx.clubPlayer.update({
      where: { clubId_id: { clubId: context.clubId, id: moved.id } },
      data: { removedAt: now, linkedToClubPlayerId: target.id, revision: { increment: 1 } },
    })
    return { clubPlayerId: target.id, movedClubPlayerId: moved.id, name }
  })
}
