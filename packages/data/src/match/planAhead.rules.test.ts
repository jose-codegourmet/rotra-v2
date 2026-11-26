import { describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { createPlanAheadFixtures } from '../fixtures/planAhead'
import { generateAutoQueueMatches } from './autoQueue.rules'
import { allPlayers } from './match.rules'
import {
  AVAILABLE_PLAYERS_EMPTY,
  autoQueueEmptyText,
  draftWaitStatus,
  matchExpectedFinish,
  minutesPlayed,
  PLAN_AHEAD_EMPTY,
  PLAN_AHEAD_NO_PRESENT,
  planAheadMinutesLeft,
  planAheadPool,
  rankPlanAhead,
} from './planAhead.rules'

const now = 1800000000000
const scenario = () => createPlanAheadFixtures(now)

describe('expected finish of a court-holding match', () => {
  it('reads each court of the scenario from the scoring mode and the minutes played', () => {
    const s = scenario()
    expect(matchExpectedFinish(s.finishingSoon, '31', now).text).toBe('Finishing soon')
    expect(matchExpectedFinish(s.midGame, '31', now).text).toBe('Ends in about 10 min')
    expect(matchExpectedFinish(s.gettingReady, '31', now)).toMatchObject({
      phase: 'notStarted',
      minutesLeft: 15,
    })
    // The same 13 minutes are past the typical length of 11/21.
    expect(matchExpectedFinish(s.finishingSoon, '21', now).text).toBe(
      'Could end any time · may be in deuce',
    )
    expect(minutesPlayed(now + 60000, now)).toBe(0)
  })
  it('recomputes as the clock moves', () => {
    const s = scenario()
    expect(matchExpectedFinish(s.midGame, '31', now + 7 * 60000).phase).toBe('soon')
    expect(matchExpectedFinish(s.midGame, '31', now + 20 * 60000).phase).toBe('long')
  })
})

describe('Plan Ahead pool and ranking', () => {
  it('uses free players and a Finishing soon court; leaves out mid-game and Getting ready courts', () => {
    const s = scenario()
    const pool = planAheadPool(s.session, s, now).map((p) => p.id)
    const free = s.roster
      .filter((p) => p.present && !s.matches.some((m) => allPlayers(m).includes(p.id)))
      .map((p) => p.id)
    expect(free.length).toBeGreaterThan(0)
    expect(new Set(pool)).toEqual(new Set([...free, ...allPlayers(s.finishingSoon)]))
    for (const id of [...allPlayers(s.midGame), ...allPlayers(s.gettingReady)])
      expect(pool).not.toContain(id)
  })
  it('ranks free and finishing-soon players together by load, ties to the soonest free', () => {
    const s = scenario()
    const [soon, free] = [s.finishingSoon.teamA[0] as string, s.roster.at(-1)?.id as string]
    expect(planAheadMinutesLeft(soon, s.matches, '31', now)).toBe(2)
    expect(planAheadMinutesLeft(free, s.matches, '31', now)).toBe(0)
    const players = [{ id: soon }, { id: free }]
    // Same load: the free player first. A lower load wins over being free sooner.
    expect(rankPlanAhead(players, () => 1, s, '31', now).map((p) => p.id)).toEqual([free, soon])
    expect(
      rankPlanAhead(players, (id) => (id === soon ? 0 : 1), s, '31', now).map((p) => p.id),
    ).toEqual([soon, free])
  })
  it('generates only from that pool', () => {
    const s = scenario()
    const result = generateAutoQueueMatches({
      session: s.session,
      ctx: s,
      mode: 'ahead',
      limit: 6,
      now,
      rng: () => 0.8,
    })
    expect(result.error).toBeNull()
    const pool = planAheadPool(s.session, s, now).map((p) => p.id)
    const used = new Set(result.matches.flatMap(allPlayers))
    expect([...used].every((id) => pool.includes(id))).toBe(true)
    expect(allPlayers(s.finishingSoon).some((id) => used.has(id))).toBe(true)
  })
  it('returns the empty copy with nobody free and no court finishing soon', () => {
    const s = scenario()
    const busy = new Set([...allPlayers(s.midGame), ...allPlayers(s.gettingReady)])
    const ctx = {
      ...s,
      roster: s.roster.map((p) => ({ ...p, present: busy.has(p.id) })),
      matches: [s.midGame, s.gettingReady],
    }
    expect(planAheadPool(s.session, ctx, now)).toEqual([])
    expect(autoQueueEmptyText('ahead', s.session, ctx, now)).toBe(PLAN_AHEAD_EMPTY)
    expect(autoQueueEmptyText('available', s.session, ctx, now)).toBe(AVAILABLE_PLAYERS_EMPTY)
    expect(
      autoQueueEmptyText(
        'ahead',
        s.session,
        { ...ctx, roster: ctx.roster.map((p) => ({ ...p, present: false })) },
        now,
      ),
    ).toBe(PLAN_AHEAD_NO_PRESENT)
    expect(autoQueueEmptyText('ahead', s.session, s, now)).toBeNull()
    expect(
      generateAutoQueueMatches({ session: s.session, ctx, mode: 'ahead', limit: 2, now }).error,
    ).toBe('Made 0 of 2: not enough free or finishing-soon players for another match.')
  })
})

describe('draft status: the court a draft waits for', () => {
  const draft = (teamA: string[], teamB: string[]) => ({
    format: 'doubles' as const,
    teamA,
    teamB,
  })
  it('names one court with the lowercase expected finish', () => {
    const s = scenario()
    const free = s.roster.at(-1)?.id as string
    const status = draftWaitStatus(
      draft([s.finishingSoon.teamA[0] as string, free], [s.finishingSoon.teamB[0] as string, free]),
      s,
      '31',
      now,
    )
    expect(status?.text).toBe('Waits for Court 1 · finishing soon')
    expect(status?.phase).toBe('soon')
    expect(draftWaitStatus(draft([s.midGame.teamA[0] as string], []), s, '31', now)?.text).toBe(
      'Waits for Court 2 · ends in about 10 min',
    )
    expect(draftWaitStatus(draft([free], []), s, '31', now)).toBeNull()
  })
  it('lists two or more courts and names the one that finishes last', () => {
    const s = scenario()
    const [a, b, c] = [s.finishingSoon, s.midGame, s.gettingReady].map(
      (m) => m.teamA[0] as string,
    ) as [string, string, string]
    expect(draftWaitStatus(draft([a], [b]), s, '31', now)?.text).toBe(
      'Waits for Court 1 and Court 2 · Court 2 ends in about 10 min',
    )
    const three = draftWaitStatus(draft([a, b], [c]), s, '31', now)
    expect(three?.text).toBe('Waits for Court 1, Court 2 and Court 4 · Court 4 not started yet')
    expect(three?.courtLabels).toEqual(['Court 1', 'Court 2', 'Court 4'])
    expect(three?.waitsFor.matchId).toBe(s.gettingReady.id)
  })
  it('reads a merged 5v5 as "Court 1 + Court 2" and flags a running-long match', () => {
    const { merged } = createConsoleFixtures(now)
    const match = merged.matches[0]
    const status = draftWaitStatus(draft([match?.teamA[0] as string], []), merged, '31', now)
    expect(status?.text).toBe('Waits for Court 1 + Court 2 · running long')
    expect(status?.phase).toBe('long')
  })
})
