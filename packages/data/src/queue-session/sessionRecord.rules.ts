import type { Match } from '../match/match.types'
import type { PlayingLevel } from '../player/player.types'
import { shortName } from '../session-roster/sessionRoster.rules'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import type { SessionCourt } from './queueSession.types'

const MINUTE = 60_000
/** A recorded match longer than this is not a real match length; the replay ends it earlier. */
const REPLAY_MAX_MATCH = 90 * MINUTE
const REPLAY_FALLBACK_MATCH = 20 * MINUTE

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
  /**
   * The end the replay uses (the prototype's mEnd): the recorded end, or, when it is more than 90
   * minutes after the start (a night finished days later), the next start on its court or 20
   * minutes, whichever comes first.
   */
  replayEndAt: number
  fun: boolean
  teamA: RecordPlayer[]
  teamB: RecordPlayer[]
  winningTeam: 'A' | 'B' | null
  teamAScore: number | null
  teamBScore: number | null
  invalid: boolean
  substitutions: number
  /** One entry per substitution, oldest first, with who got the game (QM choice) */
  substitutionCredits: {
    outName: string
    inName: string
    creditTo: 'nobody' | 'incoming' | 'outgoing'
  }[]
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
  /** Free at `t`: whole minutes since the last match on this court ended; null before any match there */
  freeMinutes: number | null
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
  const replayEnd = (m: Match) => {
    const start = m.startedAt ?? input.fallbackStart
    if (m.endedAt != null && m.endedAt - start <= REPLAY_MAX_MATCH) return m.endedAt
    const next = played
      .filter(
        (x) =>
          x !== m &&
          (x.startedAt ?? 0) > start &&
          x.courtIds.some((id) => m.courtIds.includes(id)),
      )
      .map((x) => x.startedAt ?? start)
    return Math.min(start + REPLAY_FALLBACK_MATCH, ...next)
  }
  const matches: RecordMatch[] = played.map((m) => ({
    id: m.id,
    number: m.matchNo,
    courtLabels: courts.filter((c) => m.courtIds.includes(c.id)).map((c) => c.label),
    startedAt: m.startedAt ?? input.fallbackStart,
    endedAt: m.endedAt ?? input.fallbackStart,
    replayEndAt: replayEnd(m),
    fun: m.format.startsWith('fun_'),
    teamA: m.teamA.map(playerOf),
    teamB: m.teamB.map(playerOf),
    winningTeam: m.decision?.winningTeam ?? null,
    teamAScore: m.decision?.teamAScore ?? null,
    teamBScore: m.decision?.teamBScore ?? null,
    invalid: m.state === 'invalid',
    substitutions: m.substitutions.length,
    substitutionCredits: m.substitutions.map((sub) => ({
      outName: playerOf(sub.outId).name,
      inName: playerOf(sub.inId).name,
      creditTo: !sub.creditTo || sub.creditTo === 'none' ? 'nobody' : sub.creditTo,
    })),
  }))
  const from = matches.length ? Math.min(...matches.map((m) => m.startedAt)) : input.fallbackStart
  const to = Math.max(from + MINUTE, ...matches.map((m) => m.replayEndAt))
  return { courtLabels: courts.map((c) => c.label), matches, from, to }
}

/** On court at `t`: started at or before it and not yet ended (the replay's end). */
export function onCourtAt(match: Pick<RecordMatch, 'startedAt' | 'replayEndAt'>, t: number) {
  return match.startedAt <= t && t < match.replayEndAt
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
      freeMinutes: m ? null : replayFreeMinutes(history, label, t),
    }
  })
}

/** The prototype's freeChip in the replay: minutes since the last replay end on this court by `t`. */
function replayFreeMinutes(history: SessionRecordHistory, label: string, t: number) {
  const ends = history.matches
    .filter((m) => m.courtLabels.includes(label) && m.startedAt <= t)
    .map((m) => m.replayEndAt)
    .filter((end) => end <= t)
  return ends.length ? Math.max(0, Math.floor((t - Math.max(...ends)) / MINUTE)) : null
}

/** "7:55 PM · 2 games on court · 7 finished so far" (the prototype's replaySummary). */
export function replaySummaryAt(history: SessionRecordHistory, t: number) {
  const time = new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const live = history.matches.filter((m) => onCourtAt(m, t)).length
  const finished = history.matches.filter((m) => !m.invalid && m.endedAt <= t).length
  return `${time} · ${live} game${live === 1 ? '' : 's'} on court · ${finished} finished so far`
}
