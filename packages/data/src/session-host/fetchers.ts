import type { ClubPlayer } from '../club-player/clubPlayer.types'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { queueMutation, requireClubAccess } from '../mock/transaction'
import { isCurrentRecord } from '../player/unclaimed'
import { recomputeMinimum } from '../queue-session/mutations'
import { slotCapacity } from '../queue-session/queueSession.rules'
import { isRealDataMode } from '../real/mode'
import {
  realAddSessionHost,
  realGetSessionHosts,
  realRemoveSessionHost,
} from '../real/session-host'
import { hostRegistrationText } from './sessionHost.rules'
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
  state.sessionHosts ??= []
  const rows = state.sessionHosts
  const current = rows.filter((h) => h.sessionId === sessionId && h.removedAt === null)
  for (const row of current) if (!ids.includes(row.clubPlayerId)) row.removedAt = now
  const trusted = new Set(
    (state.clubTrustedHosts ?? [])
      .filter((h) => h.clubId === DEMO_CLUB_ID && h.removedAt === null)
      .map((h) => h.clubPlayerId),
  )
  const result: SessionHostRegistration = { registered: 0, waitlisted: 0 }
  const session = state.sessions.find((s) => s.id === sessionId)
  const live = session?.state === 'active'
  const capacity = slotCapacity(
    state.courts.filter((c) => c.sessionId === sessionId && !c.removedAt).length,
    session?.playersPerCourt ?? 8,
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
    const linked = state.clubPlayers
      .filter((x) => x.id === p.id || (p.playerId && x.playerId === p.playerId))
      .map((x) => x.id)
    const registered =
      state.roster.some((r) => r.sessionId === sessionId && linked.includes(r.clubPlayerId)) ||
      state.waitlist.some((w) => w.sessionId === sessionId && linked.includes(w.clubPlayerId))
    // Levels are locked once play starts: a host who would take a place needs a saved level.
    if (live && !registered && !p.playingLevel)
      throw new MockError(
        'permission',
        `${nameOf(state, p)} has no saved level. Add them as a player with a level first, then add them as a host.`,
      )
    rows.push({
      id: crypto.randomUUID(),
      clubId: DEMO_CLUB_ID,
      sessionId,
      clubPlayerId: id,
      assignedAt: now + index,
      removedAt: null,
    })
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
        present: live,
        presentChangedAt: live ? now + index : null,
        levelLockedAt: live ? now + index : null,
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

/**
 * Session management › Hosts › Add host (#1005), before or during the session: the same rules as
 * Q-SETUP (#1004). The host must be a current trusted host (the screen adds a confirmed saved player
 * to the list first). They get a host row and, unless already on the roster or waitlist, a slot
 * while one is open, otherwise the waitlist. Nothing else changes: no role, no sign-in.
 */
export function addSessionHost(input: { sessionId: string; clubPlayerId: string }) {
  if (isRealDataMode()) return realAddSessionHost(input)
  return queueMutation(
    { area: 'Session', onlineOnly: true, clubAccess: true, sessionId: input.sessionId },
    (state) => {
      const p = state.clubPlayers.find(
        (x) => x.id === input.clubPlayerId && x.clubId === DEMO_CLUB_ID && isCurrentRecord(x),
      )
      if (!p) throw new MockError('permission', 'A host is no longer one of your saved players.')
      const name = nameOf(state, p)
      const current = currentSessionHosts(state, input.sessionId)
      if (current.some((h) => h.clubPlayerId === p.id))
        throw new MockError('conflict', `${name} is already a host.`)
      const registration = assignSessionHosts(state, input.sessionId, [
        ...current.map((h) => h.clubPlayerId),
        p.id,
      ])
      recomputeMinimum(state, input.sessionId)
      return {
        data: registration,
        text: `${name} added as a host${hostRegistrationText(registration)}`,
      }
    },
  )
}

/**
 * Session management › Hosts › Remove (#1005): ends the host designation only. The player's slot or
 * waitlist place and their trusted-host status stay as they are.
 */
export function removeSessionHost(input: { sessionId: string; clubPlayerId: string }) {
  if (isRealDataMode()) return realRemoveSessionHost(input)
  return queueMutation(
    { area: 'Session', onlineOnly: true, clubAccess: true, sessionId: input.sessionId },
    (state) => {
      const row = (state.sessionHosts ?? []).find(
        (h) =>
          h.sessionId === input.sessionId &&
          h.clubPlayerId === input.clubPlayerId &&
          h.removedAt === null,
      )
      const p = state.clubPlayers.find((x) => x.id === input.clubPlayerId)
      if (!row || !p) throw new MockError('conflict', 'This player is not a host of the session.')
      row.removedAt = Date.now()
      return {
        data: { clubPlayerId: input.clubPlayerId },
        text: `${nameOf(state, p)} removed as a host`,
      }
    },
  )
}
