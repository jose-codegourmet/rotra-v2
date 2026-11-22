import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { queueMutation, requireClubAccess } from '../mock/transaction'
import { isCurrentRecord } from '../player/unclaimed'
import { isRealDataMode } from '../real/mode'
import {
  realAddTrustedHost,
  realGetTrustedHosts,
  realRemoveTrustedHost,
} from '../real/trusted-host'
import type { TrustedHost } from './trustedHost.types'

const NOT_AVAILABLE = 'Player not available.'

/** A current saved player of the demo club, by id; deleted and moved records don't count. */
function savedPlayerIn(state: MockState, clubPlayerId: string) {
  const row = state.clubPlayers.find(
    (p) => p.id === clubPlayerId && p.clubId === DEMO_CLUB_ID && isCurrentRecord(p),
  )
  if (!row) throw new MockError('permission', NOT_AVAILABLE)
  const name =
    (row.identity === 'registered' &&
      state.playerProfiles.find((p) => p.playerId === row.playerId)?.fullName) ||
    row.fullName
  return { row, name }
}

/** The demo club's current trusted hosts whose saved player is still current. */
export function currentTrustedHosts(state: MockState, clubId = DEMO_CLUB_ID): TrustedHost[] {
  return (state.clubTrustedHosts ?? [])
    .filter(
      (h) =>
        h.clubId === clubId &&
        h.removedAt === null &&
        state.clubPlayers.some(
          (p) => p.id === h.clubPlayerId && p.clubId === clubId && isCurrentRecord(p),
        ),
    )
    .sort((a, b) => a.addedAt - b.addedAt || a.id.localeCompare(b.id))
    .map(({ id, clubPlayerId, addedAt }) => ({ id, clubPlayerId, addedAt }))
}

/** Club settings › Trusted hosts (D-2026-11-22-01): the club's current trusted hosts, oldest first. */
export async function getTrustedHosts(): Promise<TrustedHost[]> {
  if (isRealDataMode()) return realGetTrustedHosts()
  await delay()
  requireClubAccess()
  return currentTrustedHosts(readMockState())
}

/**
 * Club settings › Trusted hosts › Add: puts one of the club's saved players on the trusted-host
 * list. Guests and unclaimed players qualify. Only the list changes: no role, permission or sign-in,
 * and the saved player is untouched. Online only, like the rest of Club settings.
 */
export function addTrustedHost(input: { clubPlayerId: string }) {
  if (isRealDataMode()) return realAddTrustedHost(input)
  return queueMutation({ area: 'Club settings', onlineOnly: true, clubAccess: true }, (state) => {
    const { name } = savedPlayerIn(state, input.clubPlayerId)
    const list = state.clubTrustedHosts ?? []
    if (list.some((h) => h.clubPlayerId === input.clubPlayerId && h.removedAt === null))
      throw new MockError('conflict', `${name} is already a trusted host.`)
    const host = {
      id: crypto.randomUUID(),
      clubId: DEMO_CLUB_ID,
      clubPlayerId: input.clubPlayerId,
      addedAt: Date.now(),
      removedAt: null,
    }
    state.clubTrustedHosts = [...list, host]
    return {
      data: { id: host.id, clubPlayerId: host.clubPlayerId, addedAt: host.addedAt },
      text: `${name} added to trusted hosts`,
    }
  })
}

/**
 * Club settings › Trusted hosts › Remove host (confirmed first): ends the current row. The saved
 * player, their session registrations and past session host records stay as they were.
 */
export function removeTrustedHost(input: { clubPlayerId: string }) {
  if (isRealDataMode()) return realRemoveTrustedHost(input)
  return queueMutation({ area: 'Club settings', onlineOnly: true, clubAccess: true }, (state) => {
    const { name } = savedPlayerIn(state, input.clubPlayerId)
    const current = (state.clubTrustedHosts ?? []).find(
      (h) => h.clubPlayerId === input.clubPlayerId && h.removedAt === null,
    )
    if (!current) throw new MockError('conflict', `${name} is not a trusted host.`)
    current.removedAt = Date.now()
    return {
      data: { clubPlayerId: input.clubPlayerId },
      text: `${name} removed from trusted hosts`,
    }
  })
}
