import {
  ENDING_SOON_PHASES,
  type ExpectedFinish,
  type ExpectedFinishPhase,
  expectedFinish,
} from '@rotra/schema/scoring'
import { type QueueSession, sessionScoring } from '../queue-session/queueSession.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import type { AutoQueueMode } from './autoQueue.types'
import { activeMatchFor, allPlayers, courtNames, listNames, type MatchContext } from './match.rules'
import type { Match, MatchLineup } from './match.types'

/**
 * Expected finish of the matches holding a court, and what Plan Ahead does with it (Q27.6;
 * D-2026-11-23-08, D-2026-11-23-09; mockup log 2026-11-23-queue-plan-ahead-court-finish). Nothing
 * is stored: every value is computed from the session's scoring mode, the match start and `now`,
 * so the console's 30 second refresh recomputes it. The time rule itself is `expectedFinish` in
 * `@rotra/schema/scoring`.
 *
 * Almost done (Q29.4; D-2026-11-25-02): the one stored input. A Playing match the Queue Master
 * switched to Almost done reads as the `almost` phase with 0 minutes left, whatever the time says.
 * That override lives here only; the shared `expectedFinish` rule and its cases are unchanged.
 */

// ---- Copy (the prototype's AUTO_DESCRIPTIONS, autoWorkspace and generateDrafts) ----
export const PLAN_AHEAD_DESCRIPTION =
  'Also uses players whose court is finishing soon, ranked with free players. Their matches wait until that game ends.'
/** Plan Ahead with players present, none free and no court finishing soon. */
export const PLAN_AHEAD_EMPTY =
  'No one is free and no court is finishing soon. Try again in a few minutes.'
/** Plan Ahead with nobody present. */
export const PLAN_AHEAD_NO_PRESENT = 'No present players. Mark arrivals present in Players.'
/** The other tabs with nobody free. */
export const AVAILABLE_PLAYERS_EMPTY =
  'No one is free to play right now. Try Plan Ahead to include players whose court is finishing soon.'
/** A batch that stops short: "Made {k} of {n}: not enough free or finishing-soon players for another match." */
export const notEnoughPlayersText = (made: number, limit: number, mode: AutoQueueMode) =>
  `Made ${made} of ${limit}: not enough ${mode === 'ahead' ? 'free or finishing-soon' : 'free'} players for another match.`

// ---- Expected finish of one match ----

/** Whole minutes since Start match, as the prototype's finishOf() rounds them; never below 0. */
export const minutesPlayed = (startedAt: number, now = Date.now()) =>
  Math.max(0, Math.round((now - startedAt) / 60000))

/** The time phases of `expectedFinish`, plus `almost`: the Queue Master's Almost done switch. */
export type MatchFinishPhase = ExpectedFinishPhase | 'almost'
/** `ExpectedFinish` with the phase widened by `almost`. */
export type MatchExpectedFinish = Omit<ExpectedFinish, 'phase'> & { phase: MatchFinishPhase }
/** The finish of a Playing match switched to Almost done (the prototype's finishOf, phase `almost`). */
export const ALMOST_DONE_FINISH: MatchExpectedFinish = {
  phase: 'almost',
  minutesLeft: 0,
  text: 'Almost done',
  tag: 'almost done',
}
/** Almost done only ever counts while the match is Playing (started and not ended). */
export const isAlmostDone = (match: Pick<Match, 'state' | 'startedAt' | 'almostDoneAt'>) =>
  match.state === 'active' && match.startedAt != null && match.almostDoneAt != null

/**
 * A court-holding match's expected finish under the session's scoring mode. A Getting ready match
 * (On court, or anything without a start) is Not started yet and counts the full typical length.
 * A Playing match switched to Almost done reads Almost done with 0 minutes left, whatever the time
 * estimate says.
 */
export function matchExpectedFinish(
  match: Pick<Match, 'state' | 'startedAt' | 'almostDoneAt'>,
  scoring: unknown,
  now = Date.now(),
): MatchExpectedFinish {
  if (isAlmostDone(match)) return ALMOST_DONE_FINISH
  return expectedFinish(
    scoring,
    match.state === 'active' && match.startedAt != null
      ? minutesPlayed(match.startedAt, now)
      : null,
  )
}
/**
 * Almost done, Finishing soon, Could end any time or Running long: the phases Plan Ahead may draw
 * players from.
 */
export const endsSoon = (finish: Pick<MatchExpectedFinish, 'phase'>) =>
  finish.phase === 'almost' || ENDING_SOON_PHASES.includes(finish.phase)

// ---- Plan Ahead pool and ranking ----

/**
 * Whether Plan Ahead may use this player as far as courts go: free, or busy on a court that is
 * Almost done, Finishing soon, Could end any time or Running long. Players on a court still mid-game (Ends in
 * about N min) or Getting ready are left out.
 */
export function planAheadEligible(
  playerId: string,
  matches: Match[],
  scoring: unknown,
  now = Date.now(),
) {
  const busy = activeMatchFor(playerId, matches)
  return !busy || endsSoon(matchExpectedFinish(busy, scoring, now))
}
/**
 * Expected minutes until the player is free, the Plan Ahead tie-break: 0 for a free player, for a
 * court switched to Almost done and for a court past its typical length (Could end any time,
 * Running long).
 */
export function planAheadMinutesLeft(
  playerId: string,
  matches: Match[],
  scoring: unknown,
  now = Date.now(),
) {
  const busy = activeMatchFor(playerId, matches)
  return busy ? matchExpectedFinish(busy, scoring, now).minutesLeft : 0
}
/**
 * The session's present players Plan Ahead may use: free players plus players whose court is
 * finishing soon, in roster order. Players already in the Main Queue are still in this list;
 * Generate matches leaves them out afterwards, as it does in every tab (D-2026-11-13-07).
 */
export function planAheadPool(
  session: Pick<QueueSession, 'id' | 'scoring'>,
  ctx: Pick<MatchContext, 'roster' | 'matches'>,
  now = Date.now(),
): SessionPlayer[] {
  const scoring = sessionScoring(session)
  return ctx.roster.filter(
    (p) =>
      p.sessionId === session.id && p.present && planAheadEligible(p.id, ctx.matches, scoring, now),
  )
}
/**
 * Plan Ahead order between two players: the lower load (games played plus queued, plus drafts
 * already planned in the batch) first; ties to the soonest free (fewer expected minutes left).
 * 0 means still tied: the caller falls through to longest wait, then roster order.
 */
export const comparePlanAhead = (
  a: { load: number; minutesLeft: number },
  b: { load: number; minutesLeft: number },
) => a.load - b.load || a.minutesLeft - b.minutesLeft
/**
 * The pool ranked for Plan Ahead: free and finishing-soon players together by load, ties to the
 * soonest free, then the order given (a stable sort). `loadOf` is games played plus queued.
 */
export function rankPlanAhead<P extends { id: string }>(
  players: P[],
  loadOf: (id: string) => number,
  ctx: Pick<MatchContext, 'matches'>,
  scoring: unknown,
  now = Date.now(),
): P[] {
  const key = new Map(
    players.map((p) => [
      p.id,
      { load: loadOf(p.id), minutesLeft: planAheadMinutesLeft(p.id, ctx.matches, scoring, now) },
    ]),
  )
  const of = (p: P) => key.get(p.id) ?? { load: 0, minutesLeft: 0 }
  return [...players].sort((a, b) => comparePlanAhead(of(a), of(b)))
}

/**
 * The empty text of a Generate matches tab with no eligible player, or null when someone can be
 * used. Plan Ahead: nobody present, or nobody free and no court finishing soon. Other tabs: nobody
 * free, pointing to Plan Ahead.
 */
export function autoQueueEmptyText(
  mode: AutoQueueMode,
  session: Pick<QueueSession, 'id' | 'scoring'>,
  ctx: Pick<MatchContext, 'roster' | 'matches'>,
  now = Date.now(),
): string | null {
  const present = ctx.roster.filter((p) => p.sessionId === session.id && p.present)
  if (mode === 'ahead') {
    if (planAheadPool(session, ctx, now).length) return null
    return present.length ? PLAN_AHEAD_EMPTY : PLAN_AHEAD_NO_PRESENT
  }
  return present.some((p) => !activeMatchFor(p.id, ctx.matches)) ? null : AVAILABLE_PLAYERS_EMPTY
}

// ---- Draft status: the court a draft waits for ----

export type DraftWaitStatus = {
  /** "Waits for Court 2 · ends in about 3 min" ("· almost done" once switched), or with two or more courts "Waits for Court 1 and Court 2 · Court 2 ends in about 8 min" */
  text: string
  /** Every court the draft's busy players are on, in lineup order; a merged 5v5 is one entry, "Court 1 + Court 2" */
  courtLabels: string[]
  /** The busy match that finishes last among the draft's players */
  waitsFor: { matchId: string; courtLabel: string; finish: MatchExpectedFinish }
  /** That match's phase; the prototype draws `long` in the warn tone and the rest muted */
  phase: MatchFinishPhase
}
/**
 * What a draft waits for: the busy match that finishes last among its players (the most expected
 * minutes left; the first in lineup order on a tie), named by its court with the expected finish
 * wording in lowercase. Null when every player is free.
 */
export function draftWaitStatus(
  draft: MatchLineup,
  ctx: Pick<MatchContext, 'matches' | 'courts'>,
  scoring: unknown,
  now = Date.now(),
): DraftWaitStatus | null {
  const busy: Match[] = []
  for (const id of allPlayers(draft)) {
    const match = activeMatchFor(id, ctx.matches)
    if (match && !busy.includes(match)) busy.push(match)
  }
  const [first, ...rest] = busy.map((match) => ({
    match,
    courtLabel: courtNames(match, ctx.courts),
    finish: matchExpectedFinish(match, scoring, now),
  }))
  if (!first) return null
  const last = rest.reduce((a, b) => (b.finish.minutesLeft > a.finish.minutesLeft ? b : a), first)
  const courtLabels = [first, ...rest].map((x) => x.courtLabel)
  return {
    text:
      courtLabels.length > 1
        ? `Waits for ${listNames(courtLabels)} · ${last.courtLabel} ${last.finish.tag}`
        : `Waits for ${first.courtLabel} · ${last.finish.tag}`,
    courtLabels,
    waitsFor: { matchId: last.match.id, courtLabel: last.courtLabel, finish: last.finish },
    phase: last.finish.phase,
  }
}
