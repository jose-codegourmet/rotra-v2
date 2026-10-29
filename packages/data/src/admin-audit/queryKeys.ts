import type { AdminAuditTargetType } from './adminAudit.types'

export const adminAuditKeys = {
  all: ['admin-audit'] as const,
  byTarget: (targetType: AdminAuditTargetType, targetId: string) =>
    [...adminAuditKeys.all, targetType, targetId] as const,
}
