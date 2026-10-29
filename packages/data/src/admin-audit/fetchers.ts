import { adminAccount } from '../fixtures/adminAccounts'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import type { AdminAuditEvent, AdminAuditTargetType } from './adminAudit.types'

/**
 * Adds one line to the record inside the same store update as the change it describes. The mock
 * has a single platform owner; the real service takes the actor from the verified session.
 */
export function appendAdminAudit(
  draft: MockState,
  entry: Pick<AdminAuditEvent, 'action' | 'targetType' | 'targetId' | 'summary'>,
) {
  draft.adminAuditEvents.unshift({
    id: crypto.randomUUID(),
    actorEmail: adminAccount.email,
    at: new Date().toISOString(),
    ...entry,
  })
}

/** Swap this implementation for the real transport when the database epic lands. */
export async function listAuditEvents(
  params: { targetType: AdminAuditTargetType; targetId: string },
  signal?: AbortSignal,
): Promise<AdminAuditEvent[]> {
  await delay(400, signal)
  return readMockState()
    .adminAuditEvents.filter(
      (event) => event.targetType === params.targetType && event.targetId === params.targetId,
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}
