import type { Match } from '../match/match.types'
import { PLAYING_LEVELS, type PlayingLevel } from '../player/player.types'
export const ROSTER_DUPLICATE_ERROR = 'This player is already on the roster or waitlist.'

export function levelLabel(level: PlayingLevel) {
  return level
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
/**
 * Only a pick with no level opens the level step; unclaimed profiles are the club's own records and
 * need no identity check (D-2026-11-11-03).
 */
export function needsConfirmStep(player: { suggestion: PlayingLevel | null }) {
  return !player.suggestion
}
export function levelDiff(level: PlayingLevel, suggestion: PlayingLevel) {
  const n = PLAYING_LEVELS.indexOf(level) - PLAYING_LEVELS.indexOf(suggestion)
  return { direction: n === 0 ? 'same' : n > 0 ? 'higher' : 'lower', steps: Math.abs(n) }
}
export function bandMiddleLevel(
  band: 'beginner' | 'intermediate' | 'advanced' | 'unsure',
): PlayingLevel | null {
  return band === 'unsure' ? null : `${band}_mid`
}
export function shortName(player: { nameSnapshot: string; nicknameSnapshot: string | null }) {
  return player.nicknameSnapshot || player.nameSnapshot.split(' ')[0] || player.nameSnapshot
}
export function sessionLinkUrl(publicSlug: string, origin: string) {
  return new URL(`/s/${encodeURIComponent(publicSlug)}`, origin).href
}
/**
 * Move to waitlist (#735) is refused while the player is in any waiting, On court or Playing match.
 * A removed waiting draft no longer counts. The Queue Master's toast names them; the player's own
 * button is hidden instead, with this string kept for a refusal from the server.
 */
export function inUnfinishedMatch(
  rosterId: string,
  matches: Pick<Match, 'state' | 'teamA' | 'teamB'>[],
) {
  return matches.some(
    (m) =>
      (m.state === 'waiting' || m.state === 'on_court' || m.state === 'active') &&
      (m.teamA.includes(rosterId) || m.teamB.includes(rosterId)),
  )
}
export const stepDownBlockedText = (name: string) => `Finish or remove ${name}'s match first.`
export const SELF_STEP_DOWN_BLOCKED =
  "You're in a match. Ask the Queue Master to finish or remove it first."
