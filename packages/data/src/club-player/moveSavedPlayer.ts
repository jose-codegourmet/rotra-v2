import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { MockError } from '../mock/errors'
import type { MockState } from '../mock/store'
import { queueMutation } from '../mock/transaction'
import { isCurrentRecord, savedDisplayName, savedRecordByEmail } from '../player/unclaimed'
import { isRealDataMode } from '../real/mode'
import { realMoveSavedPlayer } from '../real/queue'

/**
 * Placeholder copy (not in the mockup): the record being moved is in a match of a session the other
 * player is in too, so its slot there can't simply be dropped.
 */
export const MOVE_SAME_SESSION_MESSAGE =
  'Both players are in a match in the same session. Finish or remove one of them there first.'

function savedRow(s: MockState, id: string) {
  const row = s.clubPlayers.find(
    (p) => p.id === id && p.clubId === DEMO_CLUB_ID && isCurrentRecord(p),
  )
  if (!row || (row.playerId && s.adminPlayerRecords[row.playerId]?.archivedAt))
    throw new MockError('permission', 'Player not available.')
  return row
}

/**
 * The Same person step (D-2026-11-16-04, rotra-queue.html mergePlayer()): the email typed in Edit
 * details for a guest (or an older record with no email) already belongs to another saved player
 * of the club, and the Queue Master confirmed "Same person as NAME?". The record moves into that
 * player's in one all-or-nothing write. It is not a free link: the email must be that player's.
 *
 * Re-pointed to the other record: session slots (`roster`), waitlist spots, join requests, award
 * history and result-snapshot rows. Games (`matches`), payments (`paymentMarks`), match requests
 * and drop-out notices point at the slot (`SessionPlayer.id`), so they move with it unchanged.
 * Slots in Prepared and Active sessions take the other player's name; finished sessions keep the
 * name as recorded. Where both hold a slot in one session the other player keeps theirs, a payment
 * marked on the moved record's slot follows, and that slot is dropped (refused while it is in a
 * match). The moved row is hidden: `linkedToClubPlayerId` with `removedAt`, like the database design's
 * `club_players.linked_to_club_player_id`.
 */
export function moveSavedPlayer(input: {
  /** The guest (or older record) the email was typed for */
  clubPlayerId: string
  /** The saved player the email already belongs to (`samePerson.clubPlayerId` of Save details) */
  intoClubPlayerId: string
  /** The email as typed in Edit details */
  email: string
}) {
  if (isRealDataMode()) return realMoveSavedPlayer(input)
  return queueMutation({ area: 'Roster', clubAccess: true }, (s) => {
    const moved = savedRow(s, input.clubPlayerId)
    if (moved.identity === 'registered' || moved.playerId || s.pendingEmails?.[moved.id])
      throw new MockError('permission', 'This player already has an email on file.')
    const target = savedRow(s, input.intoClubPlayerId)
    const same = savedRecordByEmail(s, DEMO_CLUB_ID, input.email, moved.id)
    if (target.id === moved.id || same?.id !== target.id)
      throw new MockError('conflict', 'Player not available.')
    const name = savedDisplayName(s, target)

    const live = new Set(
      s.sessions.filter((x) => x.state === 'prepared' || x.state === 'active').map((x) => x.id),
    )
    const targetSlots = new Map(
      s.roster.filter((r) => r.clubPlayerId === target.id).map((r) => [r.sessionId, r.id]),
    )
    const dropped = new Set<string>()
    const taken = new Set<string>()
    for (const slot of s.roster) {
      if (slot.clubPlayerId !== moved.id) continue
      const kept = targetSlots.get(slot.sessionId)
      if (kept) {
        const inMatch = s.matches.some(
          (m) => m.sessionId === slot.sessionId && [...m.teamA, ...m.teamB].includes(slot.id),
        )
        if (inMatch) throw new MockError('conflict', MOVE_SAME_SESSION_MESSAGE)
        // The other player keeps their slot; a payment marked on the dropped one follows.
        const paid = s.paymentMarks.find((mark) => mark.sessionPlayerId === slot.id)
        if (paid && !s.paymentMarks.some((mark) => mark.sessionPlayerId === kept))
          paid.sessionPlayerId = kept
        dropped.add(slot.id)
        continue
      }
      slot.clubPlayerId = target.id
      taken.add(slot.sessionId)
      if (live.has(slot.sessionId)) {
        slot.nameSnapshot = name
        slot.nicknameSnapshot = target.nickname
      }
    }
    s.roster = s.roster.filter((r) => !dropped.has(r.id))
    s.paymentMarks = s.paymentMarks.filter((mark) => !dropped.has(mark.sessionPlayerId))
    // One place per session: a slot beats a waitlist spot, and the other player's spot beats this one.
    const waiting = new Set(
      s.waitlist.filter((w) => w.clubPlayerId === target.id).map((w) => w.sessionId),
    )
    s.waitlist = s.waitlist.filter((w) =>
      w.clubPlayerId === target.id
        ? !taken.has(w.sessionId)
        : w.clubPlayerId !== moved.id ||
          !(targetSlots.has(w.sessionId) || waiting.has(w.sessionId)),
    )
    for (const spot of s.waitlist) if (spot.clubPlayerId === moved.id) spot.clubPlayerId = target.id
    for (const request of s.joinRequests)
      if (request.clubPlayerId === moved.id) request.clubPlayerId = target.id

    // OPEN: combining two award histories (prior sessions, baseline win rate) is rank math, so it
    // is not done here. The moved record's history moves only when the other player has none;
    // otherwise it stays on the hidden row, and no data is dropped.
    const history = s.awardHistory.find((h) => h.clubPlayerId === moved.id)
    if (history && !s.awardHistory.some((h) => h.clubPlayerId === target.id))
      history.clubPlayerId = target.id

    for (const snapshot of Object.values(s.resultSnapshots)) {
      for (const row of snapshot.standings)
        if (row.clubPlayerId === moved.id) row.clubPlayerId = target.id
      const awards = [snapshot.awards.mvp, snapshot.awards.mostImproved, ...snapshot.awards.offDay]
      for (const row of awards) if (row?.clubPlayerId === moved.id) row.clubPlayerId = target.id
      const counts = snapshot.priorSessionCounts
      if (counts && moved.id in counts && !(target.id in counts))
        snapshot.priorSessionCounts = Object.fromEntries(
          Object.entries(counts).map(([id, count]) => [id === moved.id ? target.id : id, count]),
        )
    }

    delete s.privatePhones[moved.id]
    moved.linkedToClubPlayerId = target.id
    moved.removedAt = Date.now()
    return {
      data: { clubPlayerId: target.id, movedClubPlayerId: moved.id },
      text: `Moved to ${name}`,
    }
  })
}
