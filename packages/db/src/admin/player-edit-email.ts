import 'server-only'
import type { AdminContext } from '../auth/account-context'
import { ProviderError } from '../auth/provider-admin'
import { supabaseProviderAdmin } from '../auth/supabase-provider-admin'
import { prisma } from '../client/prisma'
import { requireAdmin, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { recordAudit } from './audit'

/** Reconcile one staged Admin email update; never claim success until Auth and the contact agree. */
export async function saveAdminPlayerEmail(
  context: AdminContext,
  playerId: string,
  email: string,
  reason: string,
  expectedRevision: string,
  operationId: string,
) {
  requireAdmin(context)
  const proposed = email.trim().toLowerCase()
  const staged = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { revision: bigint }[]
    >`SELECT "revision" FROM "players" WHERE "id" = ${playerId}::uuid FOR UPDATE`
    if (!rows[0]) throw new ServiceError('not_found')
    requireRevision(rows[0].revision, expectedRevision)
    const contact = await tx.playerPrivateContact.findUnique({ where: { playerId } })
    const account = await tx.playerAccount.findUnique({ where: { playerId } })
    if (!contact || !account) throw new ServiceError('not_found')
    if (account.contactSyncStatus === 'failed')
      throw new ServiceError('conflict', {
        email: 'Resolve the existing contact sync failure first.',
      })
    const pending = await tx.adminPlayerEmailEdit.findFirst({
      where: { playerId, state: 'pending' },
    })
    if (pending && pending.proposedEmail !== proposed)
      throw new ServiceError('conflict', {
        email: 'Resolve the earlier email change before changing it again.',
      })
    const activeRequest = await tx.playerContactChangeRequest.findFirst({
      where: { playerId, status: { in: ['approved', 'applying', 'failed'] } },
      select: { id: true },
    })
    if (activeRequest)
      throw new ServiceError('conflict', { email: 'Resolve the active contact change first.' })
    const duplicate = await tx.playerPrivateContact.findUnique({ where: { email: proposed } })
    if (duplicate && duplicate.playerId !== playerId)
      throw new ServiceError('invalid', {
        email: 'This email is already linked to another player.',
      })
    if (!pending && contact.email === proposed) return { operation: null, account }
    const operation =
      pending ??
      (await tx.adminPlayerEmailEdit.create({
        data: {
          playerId,
          adminId: context.adminId,
          originalEmail: contact.email,
          proposedEmail: proposed,
          contactRevision: contact.revision,
        },
      }))
    await tx.playerAccount.update({
      where: { playerId },
      data: { contactSyncStatus: 'applying', revision: { increment: 1 } },
    })
    return { operation, account }
  })
  if (!staged.operation) return true
  const operation = staged.operation
  const provider = supabaseProviderAdmin()
  try {
    const before = await provider.readLogin(staged.account.authSubject)
    if (!before || (before.email !== operation.originalEmail && before.email !== proposed))
      return false
    if (before.email !== proposed)
      await provider.updateLogin({
        operationRef: operation.id,
        subject: staged.account.authSubject,
        email: proposed,
      })
    const after = await provider.readLogin(staged.account.authSubject)
    if (after?.email !== proposed) return false
  } catch (error) {
    if (error instanceof ProviderError && error.code === 'provider_rejected') {
      await prisma.$transaction(async (tx) => {
        await tx.adminPlayerEmailEdit.updateMany({
          where: { id: operation.id, state: 'pending' },
          data: { state: 'failed' },
        })
        await tx.playerAccount.update({
          where: { playerId },
          data: { contactSyncStatus: 'in_sync', revision: { increment: 1 } },
        })
      })
    }
    // An unavailable provider has an unknown outcome; keep its reservation for reconciliation.
    return false
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const contact = await tx.playerPrivateContact.findUniqueOrThrow({ where: { playerId } })
      if (contact.email !== operation.originalEmail) return false
      const now = new Date()
      const pending = await tx.playerContactChangeRequest.findMany({
        where: { playerId, field: 'email', status: 'pending' },
        select: { id: true },
      })
      for (const request of pending) {
        await tx.playerContactChangeRequest.update({
          where: { id: request.id },
          data: {
            status: 'rejected',
            reviewedByAdminId: context.adminId,
            reviewedAt: now,
            rejectedAt: now,
            supersededAt: now,
            resolutionNote: 'Superseded by an Admin edit',
            revision: { increment: 1 },
          },
        })
        await recordAudit(tx, context, {
          action: 'player.contact_change_rejected',
          targetType: 'player',
          targetId: playerId,
          metadata: { requestId: request.id, field: 'email', superseded: true },
        })
      }
      const saved = await tx.playerPrivateContact.update({
        where: { playerId },
        data: {
          email: proposed,
          emailVerifiedAt: null,
          revision: { increment: 1 },
        },
      })
      await tx.playerAccount.update({
        where: { playerId },
        data: {
          contactSyncStatus: 'in_sync',
          contactSyncVersion: saved.revision,
          revision: { increment: 1 },
        },
      })
      await tx.adminPlayerEmailEdit.update({
        where: { id: operation.id },
        data: { state: 'applied' },
      })
      const player = await tx.player.update({
        where: { id: playerId },
        data: { revision: { increment: 1 } },
      })
      await recordAudit(tx, context, {
        action: 'player.profile_updated',
        targetType: 'player',
        targetId: playerId,
        metadata: {
          before: { name: player.fullName, nickname: player.nickname },
          after: { name: player.fullName, nickname: player.nickname },
          changed: ['email'],
          reason,
          operationId,
        },
      })
      return true
    })
  } catch {
    // Auth may already have changed. Keep the recovery record until reconciliation succeeds.
    return false
  }
}
