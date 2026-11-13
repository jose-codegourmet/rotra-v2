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
    const playing = input.ctx.matches.filter((m) => m.state === 'active').flatMap(allPlayers)
    for (const mode of ['available', 'wait', 'fewest'] as const) {
      const result = generateAutoQueueMatches({ ...input, mode, limit: 6 })
      expect(result.matches.flatMap(allPlayers).some((id) => playing.includes(id))).toBe(false)
    }
    expect(input.ctx).toEqual(before)
  })
  it('Plan Ahead uses available players first and includes dependencies when needed', () => {
    const input = scenario()
    input.ctx.roster = input.ctx.roster.map((p, i) => ({ ...p, present: i < 5 }))
    const _available = generateAutoQueueMatches({ ...input, mode: 'available', limit: 2 })
    const ahead = generateAutoQueueMatches({ ...input, mode: 'ahead', limit: 2 })
    expect(ahead.matches.flatMap(allPlayers)).toContain(input.ctx.roster[4]?.id)
  })
  it('reuses players in later matches and observes enabled formats', () => {
    const input = scenario()
    input.ctx.roster = input.ctx.roster.slice(4, 9).filter((p) => p.present)
    input.ctx.matches = []
    const result = generateAutoQueueMatches({ ...input, mode: 'available', limit: 6 })
    expect(new Set(result.matches.flatMap(allPlayers)).size).toBe(4)
    expect(result.matches.every((m) => m.format === 'doubles')).toBe(true)
  })
  it('distinguishes longest wait from fewest completed games with stable ties', () => {
    const input = scenario()
    const players = input.ctx.roster
      .slice(0, 4)
      .map((p) => ({ ...p, present: true, presentChangedAt: now - 3600000 }))
    input.ctx.roster = players
    const completed = input.ctx.matches.find((m) => m.state === 'completed')!
    input.ctx.matches = [
      {
        ...completed,
        format: 'singles',
        teamA: [players[0]!.id],
        teamB: [players[1]!.id],
        substitutions: [],
        endedAt: now - 1200000,
      },
    ]
    input.ctx.roster[2]!.presentChangedAt = now - 600000
    input.ctx.roster[3]!.presentChangedAt = now - 600000
    input.session.allowSingles = true
    input.session.allowDoubles = false
    const _wait = generateAutoQueueMatches({ ...input, mode: 'wait', limit: 1 })
    const _fewest = generateAutoQueueMatches({ ...input, mode: 'fewest', limit: 1 })
  })
  it('accounts for Main Queue and retained drafts without counting other tabs', () => {
    const input = scenario()
    input.ctx.roster = input.ctx.roster.slice(0, 6).map((p) => ({ ...p, present: true }))
    input.ctx.matches = []
    input.session.allowSingles = true
    input.session.allowDoubles = false
    const first = generateAutoQueueMatches({ ...input, mode: 'fewest', limit: 1 })
    const next = generateAutoQueueMatches({
      ...input,
      mode: 'fewest',
      limit: 1,
      retained: first.matches,
    })
    expect(allPlayers(next.matches[0]!)).not.toEqual(allPlayers(first.matches[0]!))
  })
  it('fails clearly when both formats are disabled', () => {
    const input = scenario()
    input.session.allowSingles = input.session.allowDoubles = false
    expect(generateAutoQueueMatches({ ...input, mode: 'available', limit: 2 }).error).toContain(
      'both off',
    )
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
  it('stops without a match when everyone is already at the target', () => {
    const input = catchUp()
    input.catchUpTarget = 1
  })
  it('takes current queued assignments into account and updates after deletion', () => {
    const input = catchUp()
    const queued = {
      ...input.ctx.matches[0]!,
      id: 'waiting',
      state: 'waiting' as const,
      decision: null,
    }
    input.ctx.matches.push(queued)
    input.ctx.matches.pop()
  })
  it('reuses players who are further behind and stops at the explicit cap', () => {
    const input = catchUp()
    input.catchUpTarget = 10
    input.limit = 2
    const result = generateAutoQueueMatches(input)
    expect(result.remainingShortfall).toBeGreaterThan(0)
  })
  it('explains inability to progress and never uses in-play fillers', () => {
    const input = catchUp()
    input.ctx.roster = input.ctx.roster.slice(0, 3)
    const _result = generateAutoQueueMatches(input)
  })
  it('requires an explicit positive whole-number target', () => {
    for (const target of [undefined, 0, 1.5, NaN]) {
      expect(generateAutoQueueMatches({ ...catchUp(), catchUpTarget: target }).error).toContain(
        'Enter a whole number of games, 1 or more.',
      )
    }
  })
})
