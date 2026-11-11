import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { autoQueuePlayerCounts, generateAutoQueueMatches } from '../match/autoQueue.rules'
import {
  computeStandings,
  countedGames,
  gamesPlayed,
  gamesPlayedFor,
  type MatchContext,
} from '../match/match.rules'
import { pickerOrder } from '../match/queue.rules'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { setGamesPlayed } from './mutations'
import type { SessionPlayer } from './sessionRoster.types'

const now = Date.now(),
  fixture = createConsoleFixtures(now),
  sessionId = fixture.session.id
const ctx: MatchContext = {
  roster: fixture.roster,
  matches: fixture.matches,
  courts: fixture.courts,
  now,
}
const playerAt = (i: number): SessionPlayer => {
  const p = fixture.roster[i]
  if (!p) throw new Error(`No roster player ${i}`)
  return p
}
// Roster row 1 played the whole completed match 5 in the console fixture (row 0 was substituted out).
const played = playerAt(1)

describe('gamesPlayed (#717): counted games plus the Set games played adjustment', () => {
  it('equals the counted games when there is no adjustment', () => {
    expect(countedGames(played.id, fixture.matches)).toBeGreaterThan(0)
    expect(gamesPlayed(played, fixture.matches)).toBe(countedGames(played.id, fixture.matches))
    expect(gamesPlayed({ ...played, gamesAdjustment: 0 }, fixture.matches)).toBe(
      countedGames(played.id, fixture.matches),
    )
  })
  it('adds a positive or negative adjustment and floors the result at 0', () => {
    const counted = countedGames(played.id, fixture.matches)
    expect(gamesPlayed({ ...played, gamesAdjustment: 4 }, fixture.matches)).toBe(counted + 4)
    expect(gamesPlayed({ ...played, gamesAdjustment: -counted }, fixture.matches)).toBe(0)
    expect(gamesPlayed({ ...played, gamesAdjustment: -counted - 5 }, fixture.matches)).toBe(0)
  })
  it('keeps counting up: a later completed game adds one to the adjusted count', () => {
    const adjusted = { ...played, gamesAdjustment: 2 }
    const before = gamesPlayed(adjusted, fixture.matches)
    const completed = fixture.matches.find((m) => m.state === 'completed')
    if (!completed) throw new Error('No completed match in the fixture')
    const another = { ...completed, id: 'another-completed', matchNo: 99 }
    expect(gamesPlayed(adjusted, [...fixture.matches, another])).toBe(before + 1)
  })
  it('resolves the adjustment by roster id from a MatchContext', () => {
    const roster = ctx.roster.map((p) => (p.id === played.id ? { ...p, gamesAdjustment: 3 } : p))
    expect(gamesPlayedFor(played.id, { ...ctx, roster })).toBe(
      countedGames(played.id, fixture.matches) + 3,
    )
    expect(gamesPlayedFor('nobody', ctx)).toBe(0)
  })
})

describe('consumers read the adjusted count', () => {
  const roster = ctx.roster.map((p) => (p.id === played.id ? { ...p, gamesAdjustment: 5 } : p))
  const adjustedCtx = { ...ctx, roster }
  it('Generate matches player counts (played)', () => {
    expect(autoQueuePlayerCounts(played.id, adjustedCtx, []).played).toBe(
      countedGames(played.id, fixture.matches) + 5,
    )
  })
  it('Catch Up: a player above the target no longer needs matches', () => {
    const present = roster.filter((p) => p.present)
    const target = countedGames(played.id, fixture.matches) + 3
    const result = generateAutoQueueMatches({
      session: { ...fixture.session, allowSingles: false, allowDoubles: true },
      ctx: { ...adjustedCtx, roster: present },
      mode: 'catchup',
      limit: 20,
      catchUpTarget: target,
      now,
      rng: () => 0.5,
    })
    // Everyone else is below the target; the adjusted player (above it) is never placed.
    expect(result.matches.every((m) => ![...m.teamA, ...m.teamB].includes(played.id))).toBe(true)
  })
  it('fewest-games picker order puts the adjusted player after equal-wait players', () => {
    const free = roster.filter((p) => p.present)
    const order = pickerOrder(free, fixture.matches, fixture.session.startedAt, now)
    const sameState = order.filter(
      (p) =>
        !fixture.matches.some(
          (m) =>
            (m.state === 'active' || m.state === 'on_court') &&
            [...m.teamA, ...m.teamB].includes(p.id),
        ),
    )
    const games = sameState.map((p) => gamesPlayed(p, fixture.matches))
    for (let i = 1; i < games.length; i++) expect(games[i]!).toBeGreaterThanOrEqual(games[i - 1]!)
  })
  it('standings show the adjusted games with wins and losses as recorded', () => {
    const plain = computeStandings(ctx.roster, fixture.matches).find(
      (r) => r.playerId === played.id,
    )
    const row = computeStandings(roster, fixture.matches).find((r) => r.playerId === played.id)
    expect(plain).toBeDefined()
    expect(row).toMatchObject({ wins: plain!.wins, losses: plain!.losses, games: plain!.games + 5 })
  })
})

describe('setGamesPlayed mock mutation', () => {
  let restoreLatency: () => void
  beforeEach(() => {
    restoreLatency = setMockLatencyEnabled(false)
    mockStore.reset()
    mockStore.update((s) => {
      s.sessions = [fixture.session]
      s.roster = fixture.roster.map((p) => ({ ...p }))
      s.courts = fixture.courts
      s.matches = fixture.matches
    })
  })
  afterEach(() => restoreLatency())
  const rowOf = (id: string) => {
    const row = readMockState().roster.find((p) => p.id === id)
    if (!row) throw new Error('row missing')
    return row
  }
  it('sets one player: the shown count equals the request and the adjustment is the difference', async () => {
    const counted = countedGames(played.id, fixture.matches)
    const result = await setGamesPlayed({ sessionId, rosterId: played.id, games: counted + 4 })
    expect(result.message).toBe(
      `Games played set · ${played.nicknameSnapshot ?? played.nameSnapshot.split(' ')[0]}`,
    )
    expect(rowOf(played.id).gamesAdjustment).toBe(4)
    expect(gamesPlayed(rowOf(played.id), fixture.matches)).toBe(counted + 4)
    expect(result.data).toEqual([{ rosterId: played.id, games: counted + 4 }])
  })
  it('sets everyone to the same number and names the count', async () => {
    const result = await setGamesPlayed({ sessionId, rosterId: 'all', games: 2 })
    const roster = readMockState().roster.filter((p) => p.sessionId === sessionId)
    expect(result.message).toBe(`Games played set for ${roster.length} players`)
    for (const p of roster) expect(gamesPlayed(p, fixture.matches)).toBe(2)
    expect(readMockState().sync.log[0]?.area).toBe('Roster')
  })
  it('a later override replaces the earlier adjustment instead of stacking', async () => {
    await setGamesPlayed({ sessionId, rosterId: played.id, games: 7 })
    await setGamesPlayed({ sessionId, rosterId: played.id, games: 1 })
    expect(gamesPlayed(rowOf(played.id), fixture.matches)).toBe(1)
  })
  it('refuses a count outside 0–99 and a session that has not started', async () => {
    await expect(setGamesPlayed({ sessionId, rosterId: 'all', games: 100 })).rejects.toThrow(
      'Enter a whole number of games, 0 to 99.',
    )
    await expect(setGamesPlayed({ sessionId, rosterId: 'all', games: -1 })).rejects.toThrow()
    mockStore.update((s) => {
      const session = s.sessions.find((x) => x.id === sessionId)
      if (session) session.state = 'prepared'
    })
    await expect(setGamesPlayed({ sessionId, rosterId: 'all', games: 1 })).rejects.toThrow(
      'Start the session first.',
    )
  })
  it('replays the same operationId without writing twice', async () => {
    const first = await setGamesPlayed({
      sessionId,
      rosterId: played.id,
      games: 3,
      operationId: 'op-1',
    })
    const again = await setGamesPlayed({
      sessionId,
      rosterId: played.id,
      games: 3,
      operationId: 'op-1',
    })
    expect(again).toEqual(first)
    await expect(
      setGamesPlayed({ sessionId, rosterId: played.id, games: 4, operationId: 'op-1' }),
    ).rejects.toThrow('This confirmation was already used.')
  })
})
