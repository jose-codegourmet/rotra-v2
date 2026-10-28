import type { Match } from '../match/match.types'
import type { PlayingLevel } from '../player/player.types'
import { shortName } from '../session-roster/sessionRoster.rules'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import type { SessionCourt } from './queueSession.types'

const MINUTE = 60_000

/** One player drawn on a replay court or a match record card (the court drawing's CourtPlayer). */
export type RecordPlayer = {
  /** The session player id */
  id: string
  name: string
  shortName: string
  level: PlayingLevel | null
}
/** One finished or invalid match of a session record (Q-MATCH-RECORD), in start order. */
export type RecordMatch = {
  id: string
  number: number
  /** Every court the match used: two for a 5v5 */
  courtLabels: string[]
  startedAt: number
  endedAt: number
  fun: boolean
  teamA: RecordPlayer[]
  teamB: RecordPlayer[]
  winningTeam: 'A' | 'B' | null
  teamAScore: number | null
  teamBScore: number | null
  invalid: boolean
  substitutions: number
}
/** Q-HISTORY › How the night ran: the courts, every match that ran, and the replay's time bounds. */
export type SessionRecordHistory = {
  courtLabels: string[]
  matches: RecordMatch[]
  /** First match start */
  from: number
  /** Last match end (at least one minute after `from`) */
  to: number
}
export type ReplayCourtMoment = {
  label: string
  match: {
    number: number
    minutesIn: number
    teamA: RecordPlayer[]
    teamB: RecordPlayer[]
  } | null
}

/** Shapes a finished session's matches for the record, as the prototype's histNightPane/replayBounds do. */
export function sessionRecordHistory(input: {
  fallbackStart: number
  courts: SessionCourt[]
  roster: SessionPlayer[]
  matches: Match[]
}): SessionRecordHistory {
  const played = input.matches
    .filter((m) => m.startedAt != null && m.endedAt != null)
    .sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0))
  const courts = input.courts.filter(
    (c) => !c.removedAt || played.some((m) => m.courtIds.includes(c.id)),
  )
  const playerOf = (id: string): RecordPlayer => {
    const p = input.roster.find((x) => x.id === id)
    return p
      ? { id, name: p.nameSnapshot, shortName: shortName(p), level: p.level }
      : { id, name: 'Player', shortName: 'Player', level: null }
  }
  const matches: RecordMatch[] = played.map((m) => ({
    id: m.id,
    number: m.matchNo,
    courtLabels: courts.filter((c) => m.courtIds.includes(c.id)).map((c) => c.label),
    startedAt: m.startedAt ?? input.fallbackStart,
    endedAt: m.endedAt ?? input.fallbackStart,
    fun: m.format.startsWith('fun_'),
    teamA: m.teamA.map(playerOf),
    teamB: m.teamB.map(playerOf),
    winningTeam: m.decision?.winningTeam ?? null,
    teamAScore: m.decision?.teamAScore ?? null,
    teamBScore: m.decision?.teamBScore ?? null,
    invalid: m.state === 'invalid',
    substitutions: m.substitutions.length,
  }))
  const from = matches.length
    ? Math.min(...matches.map((m) => m.startedAt))
    : input.fallbackStart
  const to = Math.max(from + MINUTE, ...matches.map((m) => m.endedAt))
  return { courtLabels: courts.map((c) => c.label), matches, from, to }
}

/** On court at `t`: started at or before it and not yet ended. */
export function onCourtAt(match: Pick<RecordMatch, 'startedAt' | 'endedAt'>, t: number) {
  return match.startedAt <= t && t < match.endedAt
}

/** Every court as it looked at `t` (the prototype's replayCourts). */
export function replayCourtsAt(history: SessionRecordHistory, t: number): ReplayCourtMoment[] {
  return history.courtLabels.map((label) => {
    const m = history.matches.find((x) => x.courtLabels.includes(label) && onCourtAt(x, t))
    return {
      label,
      match: m
        ? {
            number: m.number,
            minutesIn: Math.floor((t - m.startedAt) / MINUTE),
            teamA: m.teamA,
            teamB: m.teamB,
          }
        : null,
    }
  })
}

/** "7:55 PM · 2 games on court · 7 finished so far" (the prototype's replaySummary). */
export function replaySummaryAt(history: SessionRecordHistory, t: number) {
  const time = new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const live = history.matches.filter((m) => onCourtAt(m, t)).length
  const finished = history.matches.filter((m) => !m.invalid && m.endedAt <= t).length
  return `${time} · ${live} game${live === 1 ? '' : 's'} on court · ${finished} finished so far`
}
