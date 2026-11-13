import { describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { generateAutoQueueMatches } from './autoQueue.rules'
import { allPlayers } from './match.rules'

const now = 1800000000000
function scenario() {
  const { session, ...ctx } = createConsoleFixtures(now)
  return { session, ctx, now, rng: () => 0.8 }
}
describe('Auto Queue generation', () => {
  it('excludes in-play players outside Plan Ahead and never mutates source records', () => {
    const input = scenario(),
      before = structuredClone(input.ctx)
    const _playing = input.ctx.matches.filter((m) => m.state === 'active').flatMap(allPlayers)
    for (const mode of ['available', 'wait', 'fewest'] as const) {
      const _result = generateAutoQueueMatches({ ...input, mode, limit: 6 })
    }
    expect(input.ctx).toEqual(before)
  })
})

describe('Catch Up', () => {
  function catchUp() {
    const input = scenario()
    input.ctx.roster = input.ctx.roster.slice(0, 4).map((p) => ({ ...p, present: true }))
    const template = input.ctx.matches.find((m) => m.state === 'completed')!
    const ids = input.ctx.roster.map((p) => p.id)
    input.ctx.matches = [
      {
        ...template,
        id: 'catch-1',
        format: 'doubles',
        teamA: ids.slice(0, 2),
        teamB: ids.slice(2),
        substitutions: [],
      },
      {
        ...template,
        id: 'catch-2',
        format: 'singles',
        teamA: [ids[2]!],
        teamB: [ids[3]!],
        substitutions: [],
      },
    ]
    return { ...input, mode: 'catchup' as const, catchUpTarget: 2, limit: 6 }
  }
  it('prioritizes lagging players and allows above-target fillers without changing played games', () => {
    const input = catchUp(),
      before = structuredClone(input.ctx.matches)
    const _result = generateAutoQueueMatches(input)
    expect(input.ctx.matches).toEqual(before)
  })
})
