import { PLAYING_LEVELS, type PlayingLevel } from '../player/player.types'
export function levelLabel(level: PlayingLevel) {
  return level
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
export function needsConfirmStep(player: { identity: string; suggestion: PlayingLevel | null }) {
  return player.identity === 'unclaimed' || !player.suggestion
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
