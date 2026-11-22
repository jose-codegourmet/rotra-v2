import type { SessionHost } from '../session-host/sessionHost.types'
import { msOf, realRequest } from './client'

type WireSessionHost = { id: string; clubPlayerId: string; assignedAt: string }

/** Q-SETUP › Hosts (#1004), from `session_hosts`. */
export async function realGetSessionHosts(sessionId: string): Promise<SessionHost[]> {
  const { hosts } = await realRequest<{ hosts: WireSessionHost[] }>(
    `/api/sessions/${encodeURIComponent(sessionId)}/hosts`,
  )
  return hosts.map((row) => ({
    id: row.id,
    clubPlayerId: row.clubPlayerId,
    assignedAt: msOf(row.assignedAt),
  }))
}
