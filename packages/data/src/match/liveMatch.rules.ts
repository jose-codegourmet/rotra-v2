import { courtsNeeded, freeCourts, type MatchContext } from './match.rules'
import type { Match, MatchLineup } from './match.types'

/**
 * Live console actions of November 19, 2026 (Q25, mock only): Pause match, moving a Playing match,
 * swapping partners while Playing and Swap from match. Checks and toast texts only; the shared
 * rules in `match.rules.ts` (court fill, `canMoveCourt`, `canStart`) are called, never changed.
 */

/** Pause match: only a Playing match with no confirmed outcome. */
export const canPauseMatch = (m: Pick<Match, 'state' | 'decision'>) =>
  m.state === 'active' && !m.decision

/**
 * Move a Playing match: onto the right number of distinct, free, open courts (two for 5v5), the
 * same check a Getting ready match gets from `canMoveCourt`. Its own courts never count as free.
 */
export function canMovePlaying(m: Match, courtIds: string[], ctx: MatchContext) {
  const free = freeCourts(ctx.courts, ctx.matches, ctx.now)
  return (
    canPauseMatch(m) &&
    courtIds.length === courtsNeeded(m) &&
    new Set(courtIds).size === courtIds.length &&
    courtIds.every((id) => free.some((c) => c.id === id))
  )
}

/**
 * Swap from match (Replace player sheet): the player coming out and an opponent in this same
 * match, while it is Getting ready or Playing.
 */
export function canSwapFromMatch(
  m: Pick<Match, 'state' | 'decision' | 'teamA' | 'teamB'>,
  outId: string,
  inId: string,
) {
  if ((m.state !== 'on_court' && m.state !== 'active') || m.decision) return false
  return (
    (m.teamA.includes(outId) && m.teamB.includes(inId)) ||
    (m.teamB.includes(outId) && m.teamA.includes(inId))
  )
}

/** Who the player coming out can swap with: the other team, in lineup order. */
export const swapFromMatchOpponents = (m: Pick<Match, 'teamA' | 'teamB'>, outId: string) =>
  m.teamA.includes(outId) ? [...m.teamB] : m.teamB.includes(outId) ? [...m.teamA] : []

/** The lineup after two players on different teams trade places (each keeps the other's slot). */
export function tradedLineup(m: MatchLineup, a: string, b: string): MatchLineup {
  const trade = (ids: string[]) => ids.map((id) => (id === a ? b : id === b ? a : id))
  return { format: m.format, teamA: trade(m.teamA), teamB: trade(m.teamB) }
}

/** “Match 17 paused · back to Getting ready on Court 3” */
export const pausedText = (matchNo: number, courts: string) =>
  `Match ${matchNo} paused · back to Getting ready on ${courts}`

/** “Match 17 moved from Court 3 to Court 4 · still playing” (or “· getting ready”). */
export const movedCourtText = (matchNo: number, from: string, to: string, playing: boolean) =>
  `Match ${matchNo} moved from ${from} to ${to} · ${playing ? 'still playing' : 'getting ready'}`

/** “Match 17: Nina and Theo swapped partners” (a swap while Playing). */
export const swappedPartnersText = (matchNo: number, a: string, b: string) =>
  `Match ${matchNo}: ${a} and ${b} swapped partners`

/** “Match 18: Nina and Theo swapped places” (Swap from match; the player coming out first). */
export const swappedPlacesText = (matchNo: number, out: string, opponent: string) =>
  `Match ${matchNo}: ${out} and ${opponent} swapped places`

/**
 * Trade courts (owner, November 25, 2026, for a match put on the wrong court): two different
 * one-court matches on courts (Getting ready or Playing), neither decided. A 5v5 never trades.
 */
export function canTradeCourts(
  m: Pick<Match, 'id' | 'state' | 'decision' | 'courtIds'>,
  n: Pick<Match, 'id' | 'state' | 'decision' | 'courtIds'>,
) {
  const one = (x: typeof m) =>
    (x.state === 'on_court' || x.state === 'active') && !x.decision && x.courtIds.length === 1
  return m.id !== n.id && one(m) && one(n)
}

/** “Match 16 now on Court 2 · Match 18 now on Court 1” */
export const tradedCourtsText = (matchNo: number, to: string, otherNo: number, otherTo: string) =>
  `Match ${matchNo} now on ${to} · Match ${otherNo} now on ${otherTo}`
