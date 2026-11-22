import type { ClubPlayer } from '../club-player/clubPlayer.types'
import type { MockState } from '../mock/store'
import { isCurrentRecord } from '../player/unclaimed'
import type { SessionHostRecord } from './sessionHost.types'

// Finished sessions keep their hosts (epic #1002, #1008, D-2026-11-22-01): the mock side of the
// `session_hosts` snapshot. Kept apart from the fetchers so Session done, Mark session invalid and
// Same person can use it without the roster placement code.

/** The name a host row keeps: the ROTRA full name for a registered record, else the club's. */
export const hostNameOf = (state: MockState, p: ClubPlayer) =>
  (p.identity === 'registered' &&
    state.playerProfiles.find((x) => x.playerId === p.playerId)?.fullName) ||
  p.fullName

const byAssigned = (a: SessionHostRecord, b: SessionHostRecord) =>
  a.assignedAt - b.assignedAt || a.id.localeCompare(b.id)

/** A finished session (#1008): completed, or marked invalid. */
const isEnded = (state: MockState, sessionId: string) => {
  const s = state.sessions.find((x) => x.id === sessionId)
  return s?.state === 'completed' || s?.state === 'invalid'
}

/**
 * The host rows a read shows (#1008, D-2026-11-22-01): an open session's current rows; a finished
 * session's rows frozen when it ended (never one removed before the end), oldest first.
 */
export function shownSessionHostRows(state: MockState, sessionId: string): SessionHostRecord[] {
  const ended = isEnded(state, sessionId)
  return (state.sessionHosts ?? [])
    .filter(
      (h) => h.sessionId === sessionId && (ended ? h.frozenAt !== null : h.removedAt === null),
    )
    .sort(byAssigned)
}

/**
 * Session done or Mark session invalid (#1008), in the same mock write: the rows still current get
 * the host's name once more and are frozen. A deleted or moved saved player keeps the row's name.
 */
export function freezeSessionHosts(state: MockState, sessionId: string, now = Date.now()) {
  for (const h of state.sessionHosts ?? []) {
    if (h.sessionId !== sessionId || h.removedAt !== null || h.frozenAt !== null) continue
    const p = state.clubPlayers.find((x) => x.id === h.clubPlayerId)
    if (p && isCurrentRecord(p)) h.nameSnapshot = hostNameOf(state, p)
    h.frozenAt = now
  }
}

/**
 * Same person (#1008): a current host row of an open session moves to the surviving record, or
 * ends when that record already hosts the session. Finished sessions keep their frozen rows.
 */
export function moveSessionHosts(
  state: MockState,
  movedId: string,
  targetId: string,
  liveSessionIds: Set<string>,
  name: string,
  now = Date.now(),
) {
  for (const h of state.sessionHosts ?? []) {
    if (h.clubPlayerId !== movedId || h.removedAt !== null || !liveSessionIds.has(h.sessionId))
      continue
    const hosting = (state.sessionHosts ?? []).some(
      (x) => x.sessionId === h.sessionId && x.clubPlayerId === targetId && x.removedAt === null,
    )
    if (hosting) h.removedAt = now
    else {
      h.clubPlayerId = targetId
      h.nameSnapshot = name
    }
  }
}
