import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import type { Match } from './match.types'

/** Search full names and nicknames without changing the queue. */
export function matchesPlayerText(match: Match, roster: SessionPlayer[], text: string) {
  const query = text.trim().toLocaleLowerCase()
  if (!query) return false
  const ids = new Set([...match.teamA, ...match.teamB])
  return roster.some(
    (player) =>
      ids.has(player.id) &&
      `${player.nameSnapshot} ${player.nicknameSnapshot ?? ''}`.toLocaleLowerCase().includes(query),
  )
}
export function queueSearchHitCount(matches: Match[], roster: SessionPlayer[], text: string) {
  return matches.filter(
    (match) => match.state === 'waiting' && matchesPlayerText(match, roster, text),
  ).length
}
