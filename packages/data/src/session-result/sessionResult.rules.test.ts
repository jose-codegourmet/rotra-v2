import { describe, expect, it } from 'vitest'
import type { Match } from '../match/match.types'
import type { PlayingLevel } from '../player/player.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import {
  awardBaseline,
  buildExportFrames,
  computeAwards,
  paginateStandings,
  sessionStandings,
} from './sessionResult.rules'
import type { PlayerAwardHistory, StandingRow } from './sessionResult.types'

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
const roster = [player('Zoe'), player('Amy'), player('Ben'), player('Dan'), player('Eve')]
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
const history = (
  ...rows: [name: string, priorSessions: number, baselineWinRate: number | null][]
): PlayerAwardHistory[] =>
  rows.map(([name, priorSessions, baselineWinRate]) => ({
    clubPlayerId: `club-${name}`,
    priorSessions,
    baselineWinRate,
  }))

describe('session standings', () => {
  it('numbers the live leaderboard order with unique positions', () => {
    const rows = sessionStandings(roster, [
      game(['Zoe'], ['Amy']),
      game(['Amy'], ['Ben']),
      game(['Dan'], ['Zoe']),
    ])
    // Dan 1–0, then Zoe and Amy both 1–1 with Zoe ahead on head-to-head, then Ben 0–1.
    expect(rows.map((r) => [r.position, r.name])).toEqual([
      [1, 'Dan'],
      [2, 'Zoe'],
      [3, 'Amy'],
      [4, 'Ben'],
    ])
    expect(rows[1]).toMatchObject({ clubPlayerId: 'club-Zoe', wins: 1, losses: 1, games: 2 })
  })
  it('leaves out players without a counted game, partials and invalid matches', () => {
    const partial = game(['Zoe', 'Amy'], ['Ben', 'Dan'])
    partial.substitutions = [{ outId: 'Eve', inId: 'Zoe', team: 'A', at: 0 }]
    const invalid: Match = {
      ...game(['Eve'], ['Amy']),
      state: 'invalid',
      decision: {
        kind: 'invalid',
        winningTeam: null,
        teamAScore: null,
        teamBScore: null,
        confirmedAt: 1,
      },
    }
    expect(sessionStandings(roster, [partial, invalid]).map((r) => r.name)).toEqual([
      'Amy',
      'Ben',
      'Dan',
    ])
  })
})

describe('prototype reference awards', () => {
  it('uses the level-index expected win chance and needs two counted games for MVP', () => {
    const r = [player('Zoe', 'beginner_low'), player('Amy', 'advanced_high'), player('Ben')]
    // Zoe (0) beats Amy (8) twice: expected 1 / (1 + 10^4) each, so her score is ~2.
    const awards = computeAwards([game(['Zoe'], ['Amy']), game(['Zoe'], ['Amy'])], r, [])
    expect(awards.mvp?.name).toBe('Zoe')
    expect(awards.mvp?.score).toBeCloseTo(2 - 2 / (1 + 10 ** 4), 6)
    // One counted game is not enough, whatever the score.
    expect(computeAwards([game(['Zoe'], ['Amy'])], r, []).mvp).toBeNull()
  })
  it('lets a guest win MVP without a profile link; club players carry theirs', () => {
    const games = [game(['Zoe'], ['Amy']), game(['Zoe'], ['Amy'])]
    const guest = computeAwards(games, roster, [], [{ id: 'club-Zoe', playerId: null }])
    expect(guest.mvp).toMatchObject({ name: 'Zoe', playerId: null })
    const linked = computeAwards(games, roster, [], [{ id: 'club-Zoe', playerId: 'player-zoe' }])
    expect(linked.mvp?.playerId).toBe('player-zoe')
  })
  it('never fills Most Improved or Off Day without a five-session baseline', () => {
    const games = [
      game(['Zoe'], ['Amy']),
      game(['Zoe'], ['Amy']),
      game(['Zoe'], ['Amy']),
      game(['Zoe'], ['Amy']),
    ]
    // Zoe won everything, Amy lost everything; neither has a qualifying baseline.
    const none = computeAwards(games, roster, history(['Zoe', 4, 0.5], ['Amy', 9, null]))
    expect(none.mostImproved).toBeNull()
    expect(none.offDay).toEqual([])
  })
  it('names Most Improved at a rise of at least +0.15 and lists Off Day at drops of 0.30 or more', () => {
    const games = [
      game(['Zoe', 'Ben'], ['Amy', 'Dan']),
      game(['Zoe', 'Dan'], ['Amy', 'Ben']),
      game(['Zoe', 'Amy'], ['Ben', 'Dan'], 'B'),
      game(['Zoe', 'Amy'], ['Ben', 'Dan'], 'B'),
    ]
    // Rates tonight: Zoe 0.5, Amy 0, Ben 0.75, Dan 0.75.
    const awards = computeAwards(
      games,
      roster,
      history(['Zoe', 5, 0.4], ['Amy', 6, 0.35], ['Ben', 7, 0.5], ['Dan', 5, 0.61]),
    )
    expect(awards.mostImproved).toMatchObject({ name: 'Ben', priorSessions: 7 })
    expect(awards.mostImproved?.delta).toBeCloseTo(0.25, 6)
    expect(awards.offDay.map((x) => x.name)).toEqual(['Amy'])
    expect(awards.offDay[0]?.delta).toBeCloseTo(-0.35, 6)
  })
  it('orders Off Day by the biggest drop first', () => {
    const games = [
      game(['Zoe', 'Amy'], ['Ben', 'Dan'], 'B'),
      game(['Zoe', 'Amy'], ['Ben', 'Dan'], 'B'),
    ]
    const awards = computeAwards(games, roster, history(['Zoe', 5, 0.4], ['Amy', 5, 0.7]))
    expect(awards.offDay.map((x) => x.name)).toEqual(['Amy', 'Zoe'])
  })
})

describe('substitution game credit in results', () => {
  // Eve started Team A and went off; Zoe came in and Team A beat Amy.
  const subbed = (creditTo: 'none' | 'incoming' | 'outgoing') => {
    const m = game(['Zoe'], ['Amy'])
    m.format = 'singles'
    m.substitutions = [{ outId: 'Eve', inId: 'Zoe', team: 'A', at: 0, creditTo }]
    return m
  }
  it('counts nobody when nobody got the game', () => {
    const rows = sessionStandings(roster, [game(['Zoe'], ['Amy']), subbed('none')])
    expect(rows.find((r) => r.name === 'Zoe')).toMatchObject({ wins: 1, games: 1 })
    expect(rows.find((r) => r.name === 'Eve')).toBeUndefined()
    // Zoe has one counted game, so Amy (two losses) is the only MVP candidate.
    expect(computeAwards([game(['Zoe'], ['Amy']), subbed('none')], roster, []).mvp?.name).toBe(
      'Amy',
    )
  })
  it('gives the incoming player the game in standings and MVP', () => {
    const games = [game(['Zoe'], ['Amy']), subbed('incoming')]
    expect(sessionStandings(roster, games).find((r) => r.name === 'Zoe')).toMatchObject({
      wins: 2,
      losses: 0,
      games: 2,
    })
    expect(computeAwards(games, roster, []).mvp).toMatchObject({ name: 'Zoe', games: 2 })
  })
  it('gives the outgoing player the game and the result of their side', () => {
    const rows = sessionStandings(roster, [subbed('outgoing')])
    expect(rows.find((r) => r.name === 'Eve')).toMatchObject({ wins: 1, losses: 0, games: 1 })
    expect(rows.find((r) => r.name === 'Zoe')).toBeUndefined()
  })
  it('keeps the latest choice for a slot', () => {
    const m = subbed('incoming')
    m.teamA = ['Ben']
    m.substitutions[0]!.creditTo = 'none'
    m.substitutions.push({ outId: 'Zoe', inId: 'Ben', team: 'A', at: 1, creditTo: 'outgoing' })
    const rows = sessionStandings(roster, [m])
    expect(rows.find((r) => r.name === 'Zoe')).toMatchObject({ games: 1, wins: 1 })
    expect(rows.find((r) => r.name === 'Ben')).toBeUndefined()
    expect(rows.find((r) => r.name === 'Eve')).toBeUndefined()
  })
  it('never feeds Off Day with a credited game', () => {
    const creditedLoss = () => {
      const m = game(['Eve'], ['Dan'], 'B')
      m.format = 'singles'
      m.substitutions = [{ outId: 'Amy', inId: 'Eve', team: 'A', at: 0, creditTo: 'outgoing' }]
      return m
    }
    const games = [game(['Amy'], ['Ben']), game(['Amy'], ['Ben']), creditedLoss(), creditedLoss()]
    expect(sessionStandings(roster, games).find((r) => r.name === 'Amy')).toMatchObject({
      wins: 2,
      losses: 2,
      games: 4,
    })
    // With the credited losses Amy's rate would be 0.5 against 0.9; on full games it is 1.0.
    expect(computeAwards(games, roster, history(['Amy', 5, 0.9])).offDay).toEqual([])
  })
  it('gives nobody anything from an invalid match', () => {
    const invalid: Match = {
      ...subbed('incoming'),
      state: 'invalid',
      decision: {
        kind: 'invalid',
        winningTeam: null,
        teamAScore: null,
        teamBScore: null,
        confirmedAt: 1,
      },
    }
    expect(sessionStandings(roster, [invalid])).toEqual([])
    expect(computeAwards([invalid, invalid], roster, []).mvp).toBeNull()
  })
})

describe('export frames', () => {
  const names = (n: number) => Array.from({ length: n }, (_, i) => `Player ${i + 1}`)
  it('splits 30 rows into three Story frames of 14, 14 and 2', () => {
    const frames = paginateStandings(names(30), 'story')
    expect(frames.map((f) => [f.title, f.rows.length])).toEqual([
      ['Standings 1', 14],
      ['Standings 2', 14],
      ['Standings 3', 2],
    ])
  })
  it('splits 30 rows into three Feed frames of 10', () => {
    const frames = paginateStandings(names(30), 'feed')
    expect(frames.map((f) => [f.title, f.rows.length])).toEqual([
      ['Standings 1', 10],
      ['Standings 2', 10],
      ['Standings 3', 10],
    ])
  })
  it('titles a single frame plainly and keeps one frame for empty standings', () => {
    expect(paginateStandings(names(14), 'story').map((f) => f.title)).toEqual(['Standings'])
    expect(paginateStandings([], 'feed')).toEqual([{ title: 'Standings', rows: [] }])
  })
  it('adds Awards and only includes Off Day when chosen', () => {
    const standings: StandingRow[] = names(3).map((name, i) => ({
      position: i + 1,
      sessionPlayerId: name,
      clubPlayerId: name,
      name,
      wins: 1,
      losses: 0,
      games: 1,
    }))
    const row = { sessionPlayerId: 'x', clubPlayerId: 'x', playerId: null, games: 2, score: 1 }
    const snapshot = {
      standings,
      awards: {
        mvp: { ...row, name: 'Player 1' },
        mostImproved: null,
        offDay: [
          {
            ...row,
            name: 'Player 3',
            priorSessions: 5,
            baselineWinRate: 0.8,
            winRate: 0,
            delta: -0.8,
          },
        ],
      },
    }
    expect(
      buildExportFrames(
        snapshot,
        { slides: ['standings', 'awards'], includeOffDay: false },
        'story',
      ),
    ).toEqual([
      { title: 'Standings', rows: ['Player 1', 'Player 2', 'Player 3'] },
      { title: 'Awards', rows: ['MVP · Player 1'] },
    ])
    expect(
      buildExportFrames(snapshot, { slides: ['awards'], includeOffDay: true }, 'feed').map(
        (f) => f.title,
      ),
    ).toEqual(['Awards', 'Off Day'])
    expect(
      buildExportFrames(
        { ...snapshot, awards: { ...snapshot.awards, mvp: null } },
        { slides: ['awards'], includeOffDay: false },
        'feed',
      ),
    ).toEqual([{ title: 'Awards', rows: ['MVP · none'] }])
  })
})

describe('Most Improved and Off Day baseline', () => {
  const sessions = ['s1', 's2', 's3', 's4', 's5'].map((sessionId) => ({
    clubPlayerId: 'club-Amy',
    sessionId,
  }))
  const fact = (sessionId: string, won: boolean, fullParticipation = true) => ({
    clubPlayerId: 'club-Amy',
    sessionId,
    fullParticipation,
    team: 'A' as const,
    winningTeam: won ? ('A' as const) : ('B' as const),
  })
  it('uses full games only: a credited substitute game never changes it', () => {
    const full = [fact('s1', true), fact('s2', true), fact('s3', false), fact('s4', true)]
    // The game the operator gave Amy in s5 (a partial fact) is left out of the rate.
    const withCredited = [...full, fact('s5', false, false), fact('s5', false, false)]
    const [plain] = awardBaseline(['club-Amy'], sessions, full)
    const [credited] = awardBaseline(['club-Amy'], sessions, withCredited)
    expect(plain).toEqual({ clubPlayerId: 'club-Amy', priorSessions: 5, baselineWinRate: 0.75 })
    expect(credited).toEqual(plain)
  })
  it('has no rate without a full game and ignores sessions not in the player history', () => {
    expect(awardBaseline(['club-Amy'], sessions, [fact('s9', true)])).toEqual([
      { clubPlayerId: 'club-Amy', priorSessions: 5, baselineWinRate: null },
    ])
  })
})
