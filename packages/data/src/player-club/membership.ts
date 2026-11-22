import type { ClubPlayer, JoinedVia } from '../club-player/clubPlayer.types'
import type { MockState } from '../mock/store'
import { slotTransfersOf } from '../slot-transfer/closeSlotTransfers'

/**
 * Club membership in mock mode (#1018, D-2026-11-22-07): one saved-player record per (club, player).
 * No record: one is created. A record the player left (or the club deleted) comes back as the SAME
 * record with `removedAt` cleared, never a duplicate, and keeps how it first joined. Already a
 * member: nothing changes. No owner approval; it grants no queue-management right. Mutates the
 * draft and returns the record, or null when the player has no profile to copy a name from.
 */
export function activateClubMembership(
  s: MockState,
  playerId: string,
  clubId: string,
  joinedVia: JoinedVia,
): ClubPlayer | null {
  const existing = s.clubPlayers.find((p) => p.clubId === clubId && p.playerId === playerId)
  if (existing) {
    if (existing.removedAt) delete existing.removedAt
    return existing
  }
  const profile = s.playerProfiles.find((p) => p.playerId === playerId)
  if (!profile) return null
  const record: ClubPlayer = {
    id: crypto.randomUUID(),
    clubId,
    playerId,
    fullName: profile.fullName,
    nickname: profile.nickname,
    identity: 'registered',
    playingLevel: null,
    addedAt: Date.now(),
    joinedVia,
  }
  s.clubPlayers.push(record)
  return record
}

/**
 * Leaving a club (#1018) cancels every PENDING slot transfer the player is part of, as sender or as
 * recipient or claimant of a transfer link, in that club's sessions. `cancelled` also ends the link
 * (a link works exactly while its transfer is pending). Registrations, payments and decided transfer
 * records are untouched. Mutates the draft; returns how many were cancelled.
 */
export function cancelPendingTransfersOnLeave(
  s: MockState,
  playerId: string,
  clubId: string,
  now = Date.now(),
) {
  const sessionIds = new Set(s.sessions.filter((x) => x.clubId === clubId).map((x) => x.id))
  let cancelled = 0
  for (const t of slotTransfersOf(s))
    if (
      t.status === 'pending' &&
      sessionIds.has(t.sessionId) &&
      (t.senderPlayerId === playerId || t.recipientPlayerId === playerId)
    ) {
      t.status = 'cancelled'
      t.decidedAt = now
      cancelled++
    }
  return cancelled
}

/**
 * Leaving a club (#1018) also ends the player's current trusted-host row in that club (epic #1002):
 * `removedAt` is set and the row stays as history, so the Host badge goes and rejoining (the same
 * saved player brought back) never restores it; the club adds them again in Club settings if it
 * wants. It covers the records being left and any record moved into them (Same person), since the
 * surviving record decides the badge. Session host records are untouched. Mutates the draft;
 * returns how many rows were ended.
 */
export function endTrustedHostsOnLeave(
  s: MockState,
  leftClubPlayerIds: string[],
  now = Date.now(),
) {
  const left = new Set(leftClubPlayerIds)
  const covered = new Set(
    s.clubPlayers
      .filter((p) => left.has(p.id) || (p.linkedToClubPlayerId && left.has(p.linkedToClubPlayerId)))
      .map((p) => p.id),
  )
  let ended = 0
  for (const host of s.clubTrustedHosts ?? [])
    if (!host.removedAt && covered.has(host.clubPlayerId)) {
      host.removedAt = now
      ended++
    }
  return ended
}
