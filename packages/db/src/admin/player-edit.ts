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
import { readAdminPlayerDirectory } from './players'

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
  const operationId = crypto.randomUUID()
  const { changed, coreChanged, revision } = await saveAdminPlayerCore(context, {
    ...input,
    operationId,
  })
  const saved: AdminPlayerChangedField[] = [...coreChanged]
  const warnings: string[] = []
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
