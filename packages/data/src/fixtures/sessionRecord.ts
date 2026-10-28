import { computeStandings } from '../match/match.rules'
import type { Match } from '../match/match.types'
import type { PlayingLevel } from '../player/player.types'
import { shortName } from '../session-roster/sessionRoster.rules'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { createSessionHistoryFixtures } from './sessionHistory'

const MINUTE = 60_000

/** One player drawn on a replay court; the same shape as the court drawing's CourtPlayer. */
export type ReplayPlayer = {
  id: string
  name: string
  shortName: string
  level: PlayingLevel | null
}

/** One court as it looked at a moment of the night: its match in play, or free. */
export type ReplayCourtMoment = {
  label: string
  match: { number: number; minutesIn: number; teamA: ReplayPlayer[]; teamB: ReplayPlayer[] } | null
}

/** The replay card's inputs at one time: the courts, and the summary line under the bar. */
export type ReplayMoment = {
  value: number
  courts: ReplayCourtMoment[]
  summary: string
}

/** One match as the session record lists it by court (Q-MATCH-RECORD). */
export type SessionRecordMatch = {
  id: string
  number: number
  courtLabel: string
  startedAt: number
  endedAt: number
  fun: boolean
  teamA: ReplayPlayer[]
  teamB: ReplayPlayer[]
  winningTeam: 'A' | 'B' | null
  teamAScore: number | null
  teamBScore: number | null
  invalid: boolean
  substitutions: number
}

/** One Players-tab card of a session record. `rank` is null for players without a counted game. */
export type SessionRecordPlayerCard = {
  playerId: string
  name: string
  level: PlayingLevel | null
  rank: number | null
  games: number
  wins: number
  losses: number
}

const formatTime = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

const onCourtAt = (m: Match, t: number) =>
  m.startedAt != null && m.startedAt <= t && t < (m.endedAt ?? Number.POSITIVE_INFINITY)

/**
 * Story-only session record data built on Thursday Open Play (h1): the standings with each
 * player's locked level, one Players-tab card per roster player (most games first), and the replay
 * at three moments of the night, shaped like the prototype's replayBounds(), replayCourts() and
 * replaySummary(). The real shaping for the screen belongs to Q08.6.
 */
export function createSessionRecordFixtures(now = Date.now()) {
  const history = createSessionHistoryFixtures(now).histories[0]
  if (!history) throw new Error('Missing session history fixture.')
  const { session, courts, roster, matches } = history

  const playerOf = (id: string): ReplayPlayer => {
    const p = roster.find((x) => x.id === id)
    if (!p) throw new Error('A history match references a missing roster player.')
    return { id, name: p.nameSnapshot, shortName: shortName(p), level: p.level }
  }

  const courtsAt = (t: number): ReplayCourtMoment[] =>
    courts.map((c) => {
      const m = matches.find((x) => x.courtIds.includes(c.id) && onCourtAt(x, t))
      return {
        label: c.label,
        match: m
          ? {
              number: m.matchNo,
              minutesIn: Math.floor((t - (m.startedAt ?? t)) / MINUTE),
              teamA: m.teamA.map(playerOf),
              teamB: m.teamB.map(playerOf),
            }
          : null,
      }
    })

  const summaryAt = (t: number) => {
    const finished = matches.filter(
      (m) => m.state === 'completed' && m.endedAt != null && m.endedAt <= t,
    ).length
    const live = matches.filter((m) => onCourtAt(m, t)).length
    return `${formatTime(t)} · ${live} game${live === 1 ? '' : 's'} on court · ${finished} finished so far`
  }

  const moment = (value: number): ReplayMoment => ({
    value,
    courts: courtsAt(value),
    summary: summaryAt(value),
  })

  const started = matches.flatMap((m) => (m.startedAt != null ? [m.startedAt] : []))
  const from = started.length
    ? Math.min(...started)
    : (session.startedAt ?? session.scheduledStartAt)
  const to = Math.max(from + MINUTE, ...matches.map((m) => m.endedAt ?? m.startedAt ?? from))

  // The first minute at or after the middle of the night with at least two courts busy.
  const halfway = from + Math.round((to - from) / 2 / MINUTE) * MINUTE
  let mid = halfway
  while (mid < to && courtsAt(mid).filter((c) => c.match).length < 2) mid += MINUTE
  if (mid >= to) mid = halfway

  const standings = computeStandings(roster, matches).map((r) => ({
    ...r,
    level: roster.find((p) => p.id === r.playerId)?.level ?? null,
  }))
  const rankOf = new Map(standings.map((r, i) => [r.playerId, i + 1] as const))
  const rowOf = new Map(standings.map((r) => [r.playerId, r] as const))

  const playerCards: SessionRecordPlayerCard[] = roster
    .map((p: SessionPlayer) => {
      const row = rowOf.get(p.id)
      return {
        playerId: p.id,
        name: p.nameSnapshot,
        level: p.level,
        rank: rankOf.get(p.id) ?? null,
        games: row?.games ?? 0,
        wins: row?.wins ?? 0,
        losses: row?.losses ?? 0,
      }
    })
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name))

  const recordMatches: SessionRecordMatch[] = matches
    .filter((m) => m.startedAt != null && m.endedAt != null)
    .sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0))
    .map((m) => ({
      id: m.id,
      number: m.matchNo,
      courtLabel: courts.find((c) => m.courtIds.includes(c.id))?.label ?? 'Court',
      startedAt: m.startedAt ?? from,
      endedAt: m.endedAt ?? to,
      fun: m.format.startsWith('fun_'),
      teamA: m.teamA.map(playerOf),
      teamB: m.teamB.map(playerOf),
      winningTeam: m.decision?.winningTeam ?? null,
      teamAScore: m.decision?.teamAScore ?? null,
      teamBScore: m.decision?.teamBScore ?? null,
      invalid: m.state === 'invalid',
      substitutions: m.substitutions.length,
    }))

  return {
    session,
    minimumGames: session.minimumGames,
    standings,
    playerCards,
    matches: recordMatches,
    replay: { from, to, start: moment(from), mid: moment(mid), end: moment(to) },
  }
}

export const sessionRecordFixture = createSessionRecordFixtures()
