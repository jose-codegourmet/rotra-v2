import type { ClubPlayer } from '../club-player/clubPlayer.types'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { requireClubAccess } from '../mock/transaction'
import { isCurrentRecord } from '../player/unclaimed'
import { slotCapacity } from '../queue-session/queueSession.rules'
import { isRealDataMode } from '../real/mode'
import { realGetSessionHosts } from '../real/session-host'
import type { SessionHost, SessionHostRegistration } from './sessionHost.types'

/** The session's current host rows, oldest first. */
export function currentSessionHosts(state: MockState, sessionId: string): SessionHost[] {
  return (state.sessionHosts ?? [])
    .filter((h) => h.sessionId === sessionId && h.removedAt === null)
    .sort((a, b) => a.assignedAt - b.assignedAt || a.id.localeCompare(b.id))
    .map(({ id, clubPlayerId, assignedAt }) => ({ id, clubPlayerId, assignedAt }))
}

/** Q-SETUP › Hosts (#1004): the session's current hosts, oldest first. */
export async function getSessionHosts(sessionId: string): Promise<SessionHost[]> {
  if (isRealDataMode()) return realGetSessionHosts(sessionId)
  await delay()
  requireClubAccess()
  const state = readMockState()
  if (!state.sessions.some((s) => s.id === sessionId && s.clubId === DEMO_CLUB_ID))
    throw new MockError('permission', 'Session not available.')
  return currentSessionHosts(state, sessionId)
}

const nameOf = (state: MockState, p: ClubPlayer) =>
  (p.identity === 'registered' &&
    state.playerProfiles.find((x) => x.playerId === p.playerId)?.fullName) ||
  p.fullName

/**
 * The mock write behind Q-SETUP › Hosts (#1004, D-2026-11-22-01), inside the create or edit
 * transaction of a prepared session. `hostIds` is the full list of current hosts after the save:
 * - A host no longer listed ends their host row; their roster or waitlist place stays.
 * - A newly listed host must be a current trusted host (the setup adds a picked saved player to the
 *   trusted-host list first, after its confirmation). They get a host row, and a place unless they
 *   (or another saved record of the same ROTRA player) already hold a slot or a waitlist place: a
 *   slot while one is open, otherwise the waitlist, the preparation rule. Their saved level comes
 *   with them; a saved player without one is placed without a level, set later in Roster and levels.
 * Hosts kept from before are left as they are.
 */
export function assignSessionHosts(
  state: MockState,
  sessionId: string,
  hostIds: string[],
  now = Date.now(),
): SessionHostRegistration {
  const ids = [...new Set(hostIds)]
  const rows = (state.sessionHosts ??= [])
  const current = rows.filter((h) => h.sessionId === sessionId && h.removedAt === null)
  for (const row of current) if (!ids.includes(row.clubPlayerId)) row.removedAt = now
  const trusted = new Set(
    (state.clubTrustedHosts ?? [])
      .filter((h) => h.clubId === DEMO_CLUB_ID && h.removedAt === null)
      .map((h) => h.clubPlayerId),
  )
  const result: SessionHostRegistration = { registered: 0, waitlisted: 0 }
  const capacity = slotCapacity(
    state.courts.filter((c) => c.sessionId === sessionId && !c.removedAt).length,
    state.sessions.find((s) => s.id === sessionId)?.playersPerCourt ?? 8,
  )
  for (const [index, id] of ids.entries()) {
    if (current.some((h) => h.clubPlayerId === id)) continue
    const p = state.clubPlayers.find(
      (x) => x.id === id && x.clubId === DEMO_CLUB_ID && isCurrentRecord(x),
    )
    if (!p) throw new MockError('permission', 'A host is no longer one of your saved players.')
    if (!trusted.has(id))
      throw new MockError(
        'conflict',
        `${nameOf(state, p)} is not a trusted host. Pick them again to add them to your trusted hosts.`,
      )
    rows.push({
      id: crypto.randomUUID(),
      clubId: DEMO_CLUB_ID,
      sessionId,
      clubPlayerId: id,
      assignedAt: now + index,
      removedAt: null,
    })
    const linked = state.clubPlayers
      .filter((x) => x.id === p.id || (p.playerId && x.playerId === p.playerId))
      .map((x) => x.id)
    const registered =
      state.roster.some((r) => r.sessionId === sessionId && linked.includes(r.clubPlayerId)) ||
      state.waitlist.some((w) => w.sessionId === sessionId && linked.includes(w.clubPlayerId))
    if (registered) continue
    const rosterCount = state.roster.filter((r) => r.sessionId === sessionId).length
    if (rosterCount < capacity) {
      state.roster.push({
        id: crypto.randomUUID(),
        sessionId,
        clubPlayerId: p.id,
        nameSnapshot: p.fullName,
        nicknameSnapshot: p.nickname,
        level: p.playingLevel,
        confirmedAt: now + index,
        present: false,
        presentChangedAt: null,
        levelLockedAt: null,
      })
      result.registered++
    } else {
      state.waitlist.push({
        id: crypto.randomUUID(),
        sessionId,
        clubPlayerId: p.id,
        level: p.playingLevel,
        addedAt: now + index,
      })
      result.waitlisted++
    }
  }
  return result
}
