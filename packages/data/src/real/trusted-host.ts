import type { TrustedHost } from '../trusted-host/trustedHost.types'
import { msOf, realRequest } from './client'
import { accepted } from './queue'

type WireTrustedHost = { id: string; clubPlayerId: string; addedAt: string }

const trustedHostOf = (row: WireTrustedHost): TrustedHost => ({
  id: row.id,
  clubPlayerId: row.clubPlayerId,
  addedAt: msOf(row.addedAt),
})

/** Club settings › Trusted hosts (D-2026-11-22-01), from `club_trusted_hosts`. */
export async function realGetTrustedHosts() {
  const { trustedHosts } = await realRequest<{ trustedHosts: WireTrustedHost[] }>(
    '/api/club/trusted-hosts',
  )
  return trustedHosts.map(trustedHostOf)
}

export async function realAddTrustedHost(input: { clubPlayerId: string }) {
  const saved = await realRequest<{ trustedHost: WireTrustedHost; message: string }>(
    '/api/club/trusted-hosts',
    { method: 'POST', body: { clubPlayerId: input.clubPlayerId } },
  )
  return accepted(trustedHostOf(saved.trustedHost), saved.message)
}

export async function realRemoveTrustedHost(input: { clubPlayerId: string }) {
  const removed = await realRequest<{ clubPlayerId: string; message: string }>(
    `/api/club/trusted-hosts/${encodeURIComponent(input.clubPlayerId)}`,
    { method: 'DELETE' },
  )
  return accepted({ clubPlayerId: removed.clubPlayerId }, removed.message)
}
