import type { Match } from '../match/match.types'
import { PLAYING_LEVELS } from '../player/player.types'
import type {
  QueueSession,
  SessionCourt,
  SessionFinalization,
} from '../queue-session/queueSession.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { DEMO_CLUB_ID } from './clubs'
import { clubPlayers } from './players'
import { venues } from './venues'

/** One past session from the prototype's ensureHistory(); finance, payments and publication are seeded by Q10.5 / Q08.4. */
export type SessionHistorySpec = {
  id: string
  title: string
  daysAgo: number
  startHour: number
  lengthHours: number
  courts: number
  /** 1-based prototype player numbers (`p1` … `p20`), in clubPlayers order. */
  players: number[]
  minimum: number
  status: 'completed' | 'invalid'
  published: boolean
  seed: number
  invalidSeq?: number[]
  invalidReason?: string
  venueIndex: number
}
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)
export const sessionHistorySpecs: SessionHistorySpec[] = [
  {
    id: 'h1',
    title: 'Thursday Open Play',
    daysAgo: 3,
    startHour: 19,
    lengthHours: 3,
    courts: 3,
    players: range(1, 18),
    minimum: 6,
    status: 'completed',
    published: true,
    seed: 11,
    invalidSeq: [14],
    venueIndex: 0,
  },
  {
    id: 'h2',
    title: 'Sunday Night Queue',
    daysAgo: 7,
    startHour: 18,
    lengthHours: 3,
    courts: 3,
    players: range(1, 15),
    minimum: 7,
    status: 'completed',
    published: false,
    seed: 22,
    venueIndex: 0,
  },
  {
    id: 'h3',
    title: 'Tuesday Drills',
    daysAgo: 12,
    startHour: 19,
    lengthHours: 2,
    courts: 2,
    players: range(3, 14),
    minimum: 4,
    status: 'invalid',
    published: false,
    seed: 33,
    invalidReason:
      'The original device was lost before its records synced, so this session could not be recorded.',
    venueIndex: 1,
  },
]
/** The prototype's mulberry32 generator, so the same seed yields the same night. */
export function seededRng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const MINUTE = 60000
export type SessionHistory = {
  session: QueueSession
  courts: SessionCourt[]
  roster: SessionPlayer[]
  matches: Match[]
  finalization: SessionFinalization | null
}
/** Port of the prototype's simulateHistory(); the rng is consumed in the same order so match lists are identical. */
export function simulateHistory(spec: SessionHistorySpec, now = Date.now()): SessionHistory {
  const r = seededRng(spec.seed)
  const date = new Date(now)
  date.setDate(date.getDate() - spec.daysAgo)
  date.setHours(spec.startHour, 0, 0, 0)
  const start = date.getTime(),
    end = start + spec.lengthHours * 3600000,
    finalizedAt = spec.status === 'completed' ? end + 10 * MINUTE : null
  const venue = venues[spec.venueIndex]
  if (!venue) throw new Error('Missing venue fixture.')
  const courts: SessionCourt[] = Array.from({ length: spec.courts }, (_, i) => ({
    id: `${spec.id}-court-${i + 1}`,
    sessionId: spec.id,
    label: `Court ${i + 1}`,
    openUntil: null,
    removedAt: null,
  }))
  const roster: SessionPlayer[] = spec.players.map((n, i) => {
    const p = clubPlayers[n - 1]
    if (!p) throw new Error('A history fixture references a missing club player.')
    return {
      id: `${spec.id}-player-${n}`,
      sessionId: spec.id,
      clubPlayerId: p.id,
      nameSnapshot: p.fullName,
      nicknameSnapshot: p.nickname,
      present: true,
      presentChangedAt: start,
      level: p.playingLevel ?? 'intermediate_low',
      levelLockedAt: start,
      confirmedAt: start - 60 * MINUTE + i * MINUTE,
    }
  })
  const levelOf = (id: string) => {
    const level = roster.find((x) => x.id === id)?.level
    return level ? PLAYING_LEVELS.indexOf(level) + 1 : 4
  }
  const session: QueueSession = {
    id: spec.id,
    clubId: DEMO_CLUB_ID,
    title: spec.title,
    notes: '',
    scheduledStartAt: start,
    scheduledEndAt: end,
    venueId: venue.id,
    venueName: venue.name,
    venueAddress: venue.address,
    state: spec.status,
    invalidReason: spec.invalidReason ?? null,
    sessionMode: 'fair',
    allowSingles: false,
    allowDoubles: true,
    minimumGames: spec.minimum,
    minimumIsCalculated: true,
    playersPerCourt: 8,
    expectedPlayers: null,
    startedAt: start,
    finalizedAt,
    playerRecordsUpdatedAt: finalizedAt,
    seriesId: null,
    publicSlug: spec.id,
    acceptJoinRequests: false,
  }
  const games: Record<string, number> = {},
    free: Record<string, number> = {},
    courtFree: Record<string, number> = {}
  for (const x of roster) {
    games[x.id] = 0
    free[x.id] = start + Math.floor(r() * 20) * MINUTE
  }
  courts.forEach((c, i) => {
    courtFree[c.id] = start + (3 + i * 2) * MINUTE
  })
  const matches: Match[] = []
  let seq = 0
  for (let guard = 0; guard < 400; guard++) {
    const c = courts.reduce((a, b) => ((courtFree[a.id] ?? 0) <= (courtFree[b.id] ?? 0) ? a : b))
    const t0 = courtFree[c.id] ?? start
    if (t0 > end - 12 * MINUTE) break
    const avail = roster
      .filter((x) => (free[x.id] ?? 0) <= t0)
      .sort(
        (a, b) =>
          (games[a.id] ?? 0) - (games[b.id] ?? 0) || (free[a.id] ?? 0) - (free[b.id] ?? 0),
      )
    if (avail.length < 4) {
      courtFree[c.id] = t0 + 3 * MINUTE
      continue
    }
    const pick = avail.slice(0, 4).map((x) => x.id)
    const sum = (ids: string[]) => ids.reduce((t, id) => t + levelOf(id), 0)
    const options = (
      [
        [
          [0, 1],
          [2, 3],
        ],
        [
          [0, 2],
          [1, 3],
        ],
        [
          [0, 3],
          [1, 2],
        ],
      ] as const
    )
      .map(([a, b]) => {
        const teamA = a.map((i) => pick[i] as string),
          teamB = b.map((i) => pick[i] as string)
        return { teamA, teamB, diff: Math.abs(sum(teamA) - sum(teamB)) }
      })
      .sort((x, y) => x.diff - y.diff)
    const o = options[0]
    if (!o) break
    const sa = sum(o.teamA),
      sb = sum(o.teamB)
    const aWins = r() < 1 / (1 + 10 ** ((sb - sa) / 4))
    const dur = 13 + Math.floor(r() * 8)
    seq += 1
    const invalid = (spec.invalidSeq ?? []).includes(seq)
    const withScore = !invalid && r() < 0.6,
      lose = 9 + Math.floor(r() * 11)
    const endedAt = t0 + dur * MINUTE
    matches.push({
      id: `${spec.id}-m${seq}`,
      sessionId: spec.id,
      matchNo: seq,
      state: invalid ? 'invalid' : 'completed',
      format: 'doubles',
      queuePosition: seq,
      origin: r() < 0.7 ? 'auto' : 'manual',
      manualProtected: false,
      teamA: o.teamA,
      teamB: o.teamB,
      courtIds: [c.id],
      startedAt: t0,
      endedAt,
      substitutions: [],
      decision: {
        kind: invalid ? 'invalid' : 'completed',
        winningTeam: invalid ? null : aWins ? 'A' : 'B',
        teamAScore: withScore ? (aWins ? 21 : lose) : null,
        teamBScore: withScore ? (aWins ? lose : 21) : null,
        confirmedAt: endedAt,
      },
    })
    for (const p of pick) {
      if (!invalid) games[p] = (games[p] ?? 0) + 1
      free[p] = endedAt + (1 + Math.floor(r() * 6)) * MINUTE
    }
    courtFree[c.id] = t0 + (dur + 2) * MINUTE
  }
  return {
    session,
    courts,
    roster,
    matches,
    finalization:
      spec.status === 'completed'
        ? {
            sessionId: spec.id,
            commandId: `${spec.id}-finalization`,
            state: 'done',
            stage: 'slides',
          }
        : null,
  }
}
/** h1 Thursday Open Play (one invalid match, seq 14), h2 Sunday Night Queue, h3 Tuesday Drills (invalid). */
export function createSessionHistoryFixtures(now = Date.now()) {
  const histories = sessionHistorySpecs.map((spec) => simulateHistory(spec, now))
  return {
    histories,
    sessions: histories.map((h) => h.session),
    courts: histories.flatMap((h) => h.courts),
    roster: histories.flatMap((h) => h.roster),
    matches: histories.flatMap((h) => h.matches),
    matchSequences: Object.fromEntries(
      histories.map((h) => [h.session.id, h.matches.length] as const),
    ),
    finalizations: Object.fromEntries(
      histories.flatMap((h) =>
        h.finalization ? [[h.session.id, h.finalization] as const] : [],
      ),
    ),
  }
}
export const sessionHistoryFixtures = createSessionHistoryFixtures()
