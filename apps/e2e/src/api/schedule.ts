import { randomUUID } from 'node:crypto'
import type { AppClient } from './client.ts'

/**
 * Re-runnable setup against a database that is not reseeded between runs (`make e2e-ui` re-runs,
 * `--repeat-each`): venues are reused by name, and new sessions go into a window no earlier
 * session of the club takes.
 */

/** The club's venue called `name`, created only when there is none yet (names are unique). */
export async function ensureVenue(client: AppClient, name: string) {
  const { venues } = await client.get<{ venues: { id: string; name: string }[] }>('/api/venues')
  const found = venues.find((venue) => venue.name === name)
  if (found) return found.id
  const id = randomUUID()
  await client.post('/api/venues', { id, name, address: '1 Test Street' })
  return id
}

export type Window = { startMs: number; endMs: number }

/** Every planned window that still takes part in the time clash rule (not invalid or cancelled). */
export async function busyWindows(client: AppClient): Promise<Window[]> {
  const { sessions } = await client.get<{
    sessions: { session: { state: string; scheduledStartAt: string; scheduledEndAt: string } }[]
  }>('/api/sessions')
  return sessions
    .map((s) => s.session)
    .filter((s) => s.state !== 'invalid' && s.state !== 'cancelled')
    .map((s) => ({ startMs: Date.parse(s.scheduledStartAt), endMs: Date.parse(s.scheduledEndAt) }))
}

export const overlaps = (busy: Window[], window: Window) =>
  busy.find((b) => b.startMs < window.endMs && window.startMs < b.endMs)

/** The first `durationMs` window from `fromMs` on (whole minutes) that clashes with nothing. */
export function firstFreeStart(busy: Window[], fromMs: number, durationMs: number) {
  const minute = 60_000
  let startMs = Math.ceil(fromMs / minute) * minute
  for (;;) {
    const hit = overlaps(busy, { startMs, endMs: startMs + durationMs })
    if (!hit) return startMs
    startMs = Math.ceil((hit.endMs + minute) / minute) * minute
  }
}
