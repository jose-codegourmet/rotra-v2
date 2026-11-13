import { expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { createMatchCardFixtures } from '../fixtures/matchCards'
import type { SessionCourt } from '../queue-session/queueSession.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { type MatchContext, nextMatchCandidates } from './match.rules'
import type { Match } from './match.types'

const roster: SessionPlayer[] = ['Zoe', 'Amy', 'Ben', 'Dan', 'Eve'].map((name) => ({
  id: name,
  sessionId: 's',
  clubPlayerId: name,
  nameSnapshot: name,
  nicknameSnapshot: null,
  present: true,
  presentChangedAt: 0,
  level: 'intermediate_mid',
  levelLockedAt: 0,
  confirmedAt: 0,
}))
function game(a: string[], b: string[], winner: 'A' | 'B' = 'A'): Match {
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

const courts: SessionCourt[] = ['Court 1', 'Court 2'].map((label, i) => ({
  id: `c${i + 1}`,
  sessionId: 's',
  label,
  openUntil: null,
  removedAt: null,
}))
const people: SessionPlayer[] = ['Migs', 'Amy', 'Ben', 'Dan', 'Eve', 'Fay', 'Gus', 'Hal'].map(
  (name) => ({ ...roster[0]!, id: name, clubPlayerId: name, nameSnapshot: name }),
)
function _lineup(
  id: string,
  state: Match['state'],
  teamA: string[],
  teamB: string[],
  courtIds: string[] = [],
): Match {
  return {
    ...game(teamA, teamB),
    id,
    state,
    courtIds,
    placedAt: state === 'waiting' ? null : 0,
    startedAt: state === 'active' ? 0 : null,
    endedAt: null,
    decision: null,
  }
}
const _ctxOf = (matches: Match[], roster = people): MatchContext => ({
  roster,
  matches,
  courts,
  now: 1,
})

it('offers five ready matches from the live Sunday Night fixture', () => {
  const live = createConsoleFixtures()
  const cards = createMatchCardFixtures().sliderCandidates
  const candidates = nextMatchCandidates(live.courts[1]!.id, {
    roster: live.roster,
    courts: live.courts,
    matches: [live.matches[0]!, ...cards.map((card) => card.match)],
  })
  expect(candidates.map((match) => match.id)).toEqual(cards.map((card) => card.match.id))
})
