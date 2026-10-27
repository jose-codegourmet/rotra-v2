import { describe, expect, it } from 'vitest'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { computeStandings } from './match.rules'
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
describe('live standings', () => {
  it('ranks most wins first and omits players without counted games', () => {
    const rows = computeStandings(roster, [game(['Zoe'], ['Amy']), game(['Zoe'], ['Ben'])])
    expect(rows.map((r) => r.playerId)).toEqual(['Zoe', 'Amy', 'Ben'])
    expect(rows[0]).toMatchObject({ wins: 2, losses: 0, games: 2 })
  })
  it('breaks equal wins by fewer losses before head-to-head', () => {
    const rows = computeStandings(roster, [
      game(['Zoe'], ['Amy']),
      game(['Amy'], ['Ben']),
      game(['Dan'], ['Zoe']),
      game(['Eve'], ['Zoe']),
    ])
    expect(rows.findIndex((r) => r.playerId === 'Amy')).toBeLessThan(
      rows.findIndex((r) => r.playerId === 'Zoe'),
    )
  })
  it('uses opposing head-to-head before alphabetical order', () => {
    const rows = computeStandings(roster, [
      game(['Zoe'], ['Amy']),
      game(['Amy'], ['Ben']),
      game(['Dan'], ['Zoe']),
    ])
    expect(rows.findIndex((r) => r.playerId === 'Zoe')).toBeLessThan(
      rows.findIndex((r) => r.playerId === 'Amy'),
    )
  })
  it('uses name when wins, losses and head-to-head are tied', () => {
    const rows = computeStandings(roster, [game(['Zoe', 'Amy'], ['Ben', 'Dan'])])
    expect(rows.map((r) => r.playerId)).toEqual(['Amy', 'Zoe', 'Ben', 'Dan'])
  })
  it('excludes substitution partials and invalid results', () => {
    const partial = game(['Zoe', 'Amy'], ['Ben', 'Dan'])
    partial.substitutions = [{ outId: 'Eve', inId: 'Zoe', team: 'A', at: 0 }]
    const invalid = {
      ...game(['Eve'], ['Amy']),
      state: 'invalid' as const,
      decision: {
        kind: 'invalid' as const,
        winningTeam: null,
        teamAScore: null,
        teamBScore: null,
        confirmedAt: 1,
      },
    }
    const rows = computeStandings(roster, [partial, invalid])
    expect(rows.map((r) => r.playerId)).toEqual(['Amy', 'Ben', 'Dan'])
    expect(rows.find((r) => r.playerId === 'Amy')).toMatchObject({ wins: 1, losses: 0, games: 1 })
  })
})
