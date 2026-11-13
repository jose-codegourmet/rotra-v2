import type { Match } from '../match/match.types'
import type { PlayingLevel } from '../player/player.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import type { PlayerAwardHistory } from './sessionResult.types'

const player = (name: string, level: PlayingLevel | null = 'intermediate_mid'): SessionPlayer => ({
  id: name,
  sessionId: 's',
  clubPlayerId: `club-${name}`,
  nameSnapshot: name,
  nicknameSnapshot: null,
  present: true,
  presentChangedAt: 0,
  level,
  levelLockedAt: 0,
  confirmedAt: 0,
})
const _roster = [player('Zoe'), player('Amy'), player('Ben'), player('Dan'), player('Eve')]
function _game(a: string[], b: string[], winner: 'A' | 'B' = 'A'): Match {
  return {
    id: crypto.randomUUID(),
    sessionId: 's',
    matchNo: 1,
    state: 'completed',
    format: 'doubles',
    queuePosition: 1,
    origin: 'manual',
    manualProtected: true,
    teamA: a,
    teamB: b,
    courtIds: [],
    startedAt: 0,
    endedAt: 1,
    substitutions: [],
    decision: {
      kind: 'completed',
      winningTeam: winner,
      teamAScore: null,
      teamBScore: null,
      confirmedAt: 1,
    },
  }
}
const _history = (
  ...rows: [name: string, priorSessions: number, baselineWinRate: number | null][]
): PlayerAwardHistory[] =>
  rows.map(([name, priorSessions, baselineWinRate]) => ({
    clubPlayerId: `club-${name}`,
    priorSessions,
    baselineWinRate,
  }))
