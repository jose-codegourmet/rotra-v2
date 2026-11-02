import type {
  AdminAuditAction,
  AdminAuditEvent,
  AdminAuditTargetType,
} from '../admin-audit/adminAudit.types'
import { NotConnectedError } from '../mock/errors'
import { realRequest } from './client'

/** One line as Admin `GET /api/audit-events` sends it; `actor` is a display name, never an ID. */
type WireAuditEvent = Omit<AdminAuditEvent, 'actorEmail'> & { actor: string }

/** The record types with a persisted log in real mode; flags and ranking settings wait on #402. */
const CONNECTED: readonly AdminAuditTargetType[] = ['club', 'player', 'contact_change_request']

export async function realListAuditEvents(
  params: { targetType: AdminAuditTargetType; targetId: string },
  signal?: AbortSignal,
): Promise<AdminAuditEvent[]> {
  if (!CONNECTED.includes(params.targetType)) throw new NotConnectedError()
  const query = new URLSearchParams({ targetType: params.targetType, targetId: params.targetId })
  const { events } = await realRequest<{ events: WireAuditEvent[] }>(`/api/audit-events?${query}`, {
    signal,
  })
  // The UI contract keeps its field name; Admin receives the actor's display label (as #378 did).
  return events.map(({ actor, ...event }) => ({
    ...event,
    action: event.action as AdminAuditAction,
    actorEmail: actor,
  }))
}
