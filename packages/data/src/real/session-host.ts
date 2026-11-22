import type { SessionHost, SessionHostRegistration } from '../session-host/sessionHost.types'
import { msOf, realRequest } from './client'
import { accepted } from './queue'

type WireSessionHost = { id: string; clubPlayerId: string; assignedAt: string; name: string }

/** Q-SETUP › Hosts (#1004), from `session_hosts`; a finished session's frozen rows (#1008). */
export async function realGetSessionHosts(sessionId: string): Promise<SessionHost[]> {
  const { hosts } = await realRequest<{ hosts: WireSessionHost[] }>(
    `/api/sessions/${encodeURIComponent(sessionId)}/hosts`,
  )
  return hosts.map((row) => ({
    id: row.id,
    clubPlayerId: row.clubPlayerId,
    assignedAt: msOf(row.assignedAt),
    name: row.name,
  }))
}

const hostsPath = (sessionId: string) => `/api/sessions/${encodeURIComponent(sessionId)}/hosts`

/** Session management › Hosts › Add host (#1005), before or during the session. */
export async function realAddSessionHost(input: { sessionId: string; clubPlayerId: string }) {
  const saved = await realRequest<{
    registration: SessionHostRegistration
    message: string
  }>(hostsPath(input.sessionId), {
    method: 'POST',
    body: { clubPlayerId: input.clubPlayerId },
  })
  return accepted(saved.registration, saved.message)
}

/** Session management › Hosts › Remove (#1005): ends the host designation only. */
export async function realRemoveSessionHost(input: { sessionId: string; clubPlayerId: string }) {
  const removed = await realRequest<{ clubPlayerId: string; message: string }>(
    `${hostsPath(input.sessionId)}/${encodeURIComponent(input.clubPlayerId)}`,
    { method: 'DELETE' },
  )
  return accepted({ clubPlayerId: removed.clubPlayerId }, removed.message)
}
