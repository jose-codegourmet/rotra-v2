import 'server-only'
import { deriveAccountVerification } from '@rotra/data/account-verification/rules'
import { recordAudit } from '../admin/audit'
import type { AdminContext, PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma } from '../generated/prisma/client'
import { requireAdmin, requireOwnPlayer, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { writePlayerNotifications } from './notification-events'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Private facts shared by the owner's page and Admin's card. Only the masked phone leaves here. */
export async function readVerification(db: Prisma.TransactionClient, playerId: string) {
  const player = await db.player.findUnique({
    where: { id: playerId, profileState: 'claimed' },
    select: {
      revision: true,
      verificationOverride: true,
      account: { select: { googleEmail: true, verificationReminderReadAt: true } },
      privateContact: { select: { email: true, phoneE164: true } },
      contactChanges: {
        where: { field: 'email', status: { in: ['pending', 'approved', 'applying'] } },
        select: { field: true, status: true, proposedValue: true },
      },
    },
  })
  if (!player?.account) return null
  const verification = deriveAccountVerification(
    {
      playerId,
      googleEmail: player.account.googleEmail,
      email: player.privateContact?.email ?? '',
      phone: player.privateContact?.phoneE164 ?? '',
    },
    player.contactChanges.map(({ field, status, proposedValue }) => ({
      playerId,
      field,
      status,
      toValue: proposedValue,
    })),
    player.verificationOverride === 'verified',
  )
  return {
    verification,
    revision: player.revision,
    reminderReadAt: player.account.verificationReminderReadAt,
  }
}

export async function readMyAccountVerification(context: PlayerContext) {
  requireOwnPlayer(context, context.playerId)
  const current = await readVerification(prisma, context.playerId)
  return current?.verification ?? null
}

export async function readAdminAccountVerification(context: AdminContext, playerId: string) {
  requireAdmin(context)
  if (!UUID.test(playerId)) return null
  const current = await readVerification(prisma, playerId)
  return current ? { ...current.verification, revision: current.revision.toString() } : null
}

/** Lock the same revision used by Admin player edits. The appended audit and override commit together. */
export async function setAdminVerificationOverride(
  context: AdminContext,
  input: { playerId: string; revision: string; verifiedByAdmin: unknown; reason: string },
) {
  requireAdmin(context)
  const { playerId, revision, verifiedByAdmin } = input
  if (!UUID.test(playerId)) throw new ServiceError('not_found')
  const reason = input.reason.trim()
  if (!reason) throw new ServiceError('invalid', { reason: 'Enter a reason.' })
  if (typeof verifiedByAdmin !== 'boolean' || !/^[1-9]\d*$/.test(revision))
    throw new ServiceError('invalid')

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "players" WHERE "id" = ${playerId}::uuid FOR UPDATE`
    const current = await readVerification(tx, playerId)
    if (!current) throw new ServiceError('not_found')
    requireRevision(current.revision, revision)
    if (current.verification.verifiedByAdmin === verifiedByAdmin)
      return { ...current.verification, revision: current.revision.toString() }

    const updated = await tx.player.update({
      where: { id: playerId },
      data: {
        verificationOverride: verifiedByAdmin ? 'verified' : null,
        verificationOverrideBy: verifiedByAdmin ? context.adminId : null,
        verificationOverrideAt: verifiedByAdmin ? new Date() : null,
        revision: { increment: 1 },
      },
      select: { revision: true },
    })
    const audit = await recordAudit(tx, context, {
      action: verifiedByAdmin
        ? 'player.verification_override_set'
        : 'player.verification_override_cleared',
      targetType: 'player',
      targetId: playerId,
      metadata: { reason },
    })
    if (verifiedByAdmin)
      await writePlayerNotifications(tx, [
        {
          playerId,
          kind: 'account',
          sourceType: 'admin_audit_event',
          sourceId: audit.id,
          title: 'ROTRA Admin verified your account',
          body: "You don't need to finish the verification steps.",
          target: '/profile/verification',
        },
      ])
    return {
      ...current.verification,
      verified: verifiedByAdmin || current.verification.completedSteps === 3,
      verifiedByAdmin,
      revision: updated.revision.toString(),
    }
  })
}
