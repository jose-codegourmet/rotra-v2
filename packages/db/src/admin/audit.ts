import 'server-only'
import type { AdminContext } from '../auth/account-context'
import type { Prisma } from '../generated/prisma/client'

type Tx = Prisma.TransactionClient

/**
 * Appends one platform-owner audit event in the caller's transaction. `metadata` carries redacted
 * before/after values only: never passwords, tokens or contact values. Repeat-safe on the command.
 */
export async function recordAudit(
  tx: Tx,
  context: AdminContext,
  event: {
    action: string
    targetType: string
    targetId: string
    sourceCommandId?: string
    metadata?: Prisma.InputJsonValue
  },
) {
  if (event.sourceCommandId) {
    const existing = await tx.adminAuditEvent.findUnique({
      where: { sourceCommandId: event.sourceCommandId },
    })
    if (existing) return existing
  }
  return tx.adminAuditEvent.create({
    data: {
      actorAdminId: context.adminId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      sourceCommandId: event.sourceCommandId ?? null,
      metadata: event.metadata,
    },
  })
}
