import type { SessionWaitlistEntry } from '../session-roster/sessionRoster.types'
import { createConsoleFixtures } from './consoleSessions'
import { clubPlayers, players, leaderboardLevels } from './players'

/**
 * Story-only waitlist for the tonight fixture: the three saved players after the 14 on the roster,
 * in the order they joined. The normal store starts with an empty waitlist.
 */
export function createWaitlistFixtures(now = Date.now()): SessionWaitlistEntry[] {
  return clubPlayers.slice(14, 17).map((p, i) => ({
    id: `s-tonight-wait-${i + 1}`,
    sessionId: 's-tonight',
    clubPlayerId: p.id,
    level: p.playingLevel,
    addedAt: now - (3 - i) * 11 * 60000,
  }))
}

export const sessionWaitlistFixture = createWaitlistFixtures()

/** Owner scenario: four courts, nine planned places each, with a late 37th arrival. */
export const admissionCapacityFixture = {
  capacity: 36,
  courtCount: 4,
  playersPerCourt: 9,
  full: 36,
  over: 37,
}

/** Separate sample; normal sessions are unchanged. One confirmed player has not arrived. */
export function createAdmissionFixtures(now = Date.now()) {
  const base = createConsoleFixtures(now)
  const session = { ...base.session, title: '36 to 37 · admission example', playersPerCourt: 9 }
  const samplePlayers = [
    ...clubPlayers,
    ...players
      .filter((p) => !clubPlayers.some((saved) => saved.playerId === p.id))
      .map((p) => ({
        id: `admission-club-${p.id}`,
        clubId: session.clubId,
        playerId: p.id,
        fullName: p.fullName,
        nickname: p.nickname,
        identity: 'registered' as const,
        playingLevel: leaderboardLevels[p.id] ?? ('intermediate_mid' as const),
        addedAt: now,
      })),
  ]
  const roster = samplePlayers.slice(0, 36).map((p, i) => ({
    id: `admission-player-${i + 1}`,
    sessionId: session.id,
    clubPlayerId: p.id,
    nameSnapshot: p.fullName,
    nicknameSnapshot: p.nickname,
    level: p.playingLevel ?? ('intermediate_mid' as const),
    confirmedAt: now - 3600000 + i,
    present: i !== 0,
    presentChangedAt: now - 3600000,
    levelLockedAt: now - 3600000,
  }))
  const waitlist = samplePlayers.slice(36, 39).map((p, i) => ({
    id: `admission-wait-${i + 1}`,
    sessionId: session.id,
    clubPlayerId: p.id,
    level: p.playingLevel ?? ('intermediate_mid' as const),
    addedAt: now - (3 - i) * 60000,
  }))
  return { session, roster, courts: base.courts, waitlist, matches: [], clubPlayers: samplePlayers }
}
