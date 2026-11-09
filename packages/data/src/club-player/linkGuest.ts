import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { MockError, NotConnectedError } from '../mock/errors'
import type { MockState } from '../mock/store'
import { queueMutation } from '../mock/transaction'
import { isRealDataMode } from '../real/mode'

/**
 * OPEN (Q19.7 #625, D-2026-11-09-06 does not say): the guest and the chosen saved player both hold
 * a slot or waitlist spot in one session. Until the owner answers (A refuse / B keep the saved
 * player's slot / C keep both), the link is refused with this placeholder; the owner's copy
 * replaces it.
 */
export const LINK_SAME_SESSION_MESSAGE =
  'Both players are in the same session. Remove one of them from that session first.'

/** Placeholder copy (not in the mockup): Link to saved player… only shows on a guest. */
const ONLY_GUESTS = 'Only a guest can be linked to a saved player.'

function savedRow(s: MockState, id: string) {
  const row = s.clubPlayers.find(
    (p) => p.id === id && p.clubId === DEMO_CLUB_ID && !p.removedAt && !p.linkedToClubPlayerId,
  )
  if (!row || (row.playerId && s.adminPlayerRecords[row.playerId]?.archivedAt))
    throw new MockError('permission', 'Player not available.')
  return row
}

function sessionsOf(s: MockState, clubPlayerId: string) {
  return new Set([
    ...s.roster.filter((r) => r.clubPlayerId === clubPlayerId).map((r) => r.sessionId),
    ...s.waitlist.filter((w) => w.clubPlayerId === clubPlayerId).map((w) => w.sessionId),
  ])
}

/**
 * Saved players › guest › Link to saved player… (D-2026-11-09-06): merges a guest into the saved
 * player the QM picked, in one all-or-nothing write. Nothing merges automatically.
 *
 * Re-pointed to the chosen record: session slots (`roster`), waitlist spots, join requests, award
 * history and result-snapshot rows. Games (`matches`), payments (`paymentMarks`), match requests and
 * drop-out notices point at the slot (`SessionPlayer.id`), so they move with it unchanged. Slots in
 * Prepared and Active sessions take the chosen player's name; finished sessions keep the name as
 * recorded. The guest row is hidden: `linkedToClubPlayerId` with `removedAt`, like the database
 * design's `club_players.linked_to_club_player_id`.
 */
export function linkGuestToSavedPlayer(input: { guestId: string; clubPlayerId: string }) {
  if (isRealDataMode()) throw new NotConnectedError()
  return queueMutation({ area: 'Roster', onlineOnly: true, clubAccess: true }, (s) => {
    const guest = savedRow(s, input.guestId)
    if (guest.identity !== 'guest') throw new MockError('permission', ONLY_GUESTS)
    if (input.clubPlayerId === guest.id) throw new MockError('permission', 'Player not available.')
    const target = savedRow(s, input.clubPlayerId)

    const targetSessions = sessionsOf(s, target.id)
    for (const sessionId of sessionsOf(s, guest.id))
      if (targetSessions.has(sessionId)) throw new MockError('conflict', LINK_SAME_SESSION_MESSAGE)

    const live = new Set(
      s.sessions.filter((x) => x.state === 'prepared' || x.state === 'active').map((x) => x.id),
    )
    for (const slot of s.roster) {
      if (slot.clubPlayerId !== guest.id) continue
      slot.clubPlayerId = target.id
      if (live.has(slot.sessionId)) {
        slot.nameSnapshot = target.fullName
        slot.nicknameSnapshot = target.nickname
      }
    }
    for (const spot of s.waitlist) if (spot.clubPlayerId === guest.id) spot.clubPlayerId = target.id
    for (const request of s.joinRequests)
      if (request.clubPlayerId === guest.id) request.clubPlayerId = target.id

    // OPEN: combining two award histories (prior sessions, baseline win rate) is rank math, so it
    // is not done here. The guest's history moves only when the chosen player has none; otherwise
    // it stays on the hidden guest row, and no data is dropped.
    const guestHistory = s.awardHistory.find((h) => h.clubPlayerId === guest.id)
    if (guestHistory && !s.awardHistory.some((h) => h.clubPlayerId === target.id))
      guestHistory.clubPlayerId = target.id

    for (const snapshot of Object.values(s.resultSnapshots)) {
      for (const row of snapshot.standings)
        if (row.clubPlayerId === guest.id) row.clubPlayerId = target.id
      const awards = [snapshot.awards.mvp, snapshot.awards.mostImproved, ...snapshot.awards.offDay]
      for (const row of awards) if (row?.clubPlayerId === guest.id) row.clubPlayerId = target.id
      const counts = snapshot.priorSessionCounts
      if (counts && guest.id in counts && !(target.id in counts))
        snapshot.priorSessionCounts = Object.fromEntries(
          Object.entries(counts).map(([id, count]) => [id === guest.id ? target.id : id, count]),
        )
    }

    guest.linkedToClubPlayerId = target.id
    guest.removedAt = Date.now()
    return {
      data: { guestId: guest.id, clubPlayerId: target.id },
      text: `Linked to ${target.fullName}`,
    }
  })
}
