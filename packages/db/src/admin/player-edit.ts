import 'server-only'
import { adminPlayerSavedMessage } from '@rotra/data/admin-player/rules'
import type { AdminPlayerChangedField, AdminPlayerEditInput } from '@rotra/data/admin-player/types'
import type { AdminContext } from '../auth/account-context'
import { setPlayerPasswordByAdmin } from '../auth/supabase-provider-admin'
import { prisma } from '../client/prisma'
import { requireAdmin } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { recordAudit } from './audit'
import { saveAdminPlayerCore } from './player-edit-core'
import { saveAdminPlayerEmail } from './player-edit-email'
import {
  plannedRtrId,
  refuseTakenRtrId,
  saveAdminSharedEntry,
  saveRegisteredRtrId,
} from './player-rtr-id'
import { readAdminPlayerDirectory, readAdminPlayerEdit } from './players'

/** Save the profile and contacts, then report each Auth outcome without dropping the saved fields. */
export async function saveAdminPlayer(
  context: AdminContext,
  input: {
    playerId: string
    revision: string
    values: Omit<AdminPlayerEditInput, 'id' | 'revision'>
  },
) {
  requireAdmin(context)
  // An unclaimed person saved with an email: the shared entry's email and RTR ID (P15.8).
  const entry = await prisma.sharedPlayerEntry.findUnique({
    where: { id: input.playerId },
    select: { id: true },
  })
  if (entry) return saveAdminSharedEntry(context, input)
  const operationId = crypto.randomUUID()
  // D-2026-11-16-04: a changed registration place or date reissues the RTR ID (checked first).
  const before = await readAdminPlayerEdit(context, input.playerId)
  const rtrPlan = before.claimed ? plannedRtrId(before, input.values) : null
  if (rtrPlan && !input.values.reason.trim())
    throw new ServiceError('invalid', { reason: 'Say why you are making this change.' })
  if (rtrPlan) await refuseTakenRtrId(rtrPlan)
  const { changed, coreChanged, revision } = await saveAdminPlayerCore(context, {
    ...input,
    operationId,
  })
  const saved: AdminPlayerChangedField[] = [...coreChanged]
  const warnings: string[] = []
  if (rtrPlan) {
    try {
      await saveRegisteredRtrId(context, {
        playerId: input.playerId,
        plan: rtrPlan,
        reason: input.values.reason.trim(),
        name: input.values.name.trim(),
        operationId,
      })
      saved.push('RTR ID')
    } catch (error) {
      // Nothing was saved yet: a taken RTR ID refuses the whole save, as in mock mode.
      if (!coreChanged.length) throw error
      warnings.push(
        error instanceof ServiceError && error.fields?.registrationDate
          ? error.fields.registrationDate
          : 'RTR ID change could not be applied. Reload and retry.',
      )
    }
  }
  if (changed.includes('email')) {
    try {
      if (
        await saveAdminPlayerEmail(
          context,
          input.playerId,
          input.values.email,
          input.values.reason.trim(),
          revision,
          operationId,
        )
      )
        saved.push('email')
      else
        warnings.push(
          'Email change could not be confirmed. Retry the email change before signing in with it.',
        )
    } catch {
      warnings.push(
        'Email change could not be applied. Check for an active request or a duplicate email, then retry.',
      )
    }
  }
  if (changed.includes('password')) {
    const account = await prisma.playerAccount.findUnique({ where: { playerId: input.playerId } })
    try {
      if (!account) throw new ServiceError('not_found')
      await setPlayerPasswordByAdmin(account.authSubject, input.values.password)
      await prisma.$transaction(async (tx) => {
        await tx.player.update({
          where: { id: input.playerId },
          data: { revision: { increment: 1 } },
        })
        await recordAudit(tx, context, {
          action: 'player.password_set',
          targetType: 'player',
          targetId: input.playerId,
          metadata: {
            reason: input.values.reason.trim(),
            name: input.values.name.trim(),
            changed: ['password'],
            operationId,
          },
        })
      })
      saved.push('password')
    } catch {
      warnings.push(
        'Password change could not be confirmed. Check before giving a password to the player.',
      )
    }
  }
  const [player] = await readAdminPlayerDirectory(context, input.playerId)
  if (!player) throw new ServiceError('not_found')
  return {
    player,
    changed: saved,
    passwordSet: saved.includes('password'),
    message: adminPlayerSavedMessage(player.name, saved),
    warnings,
  }
}
