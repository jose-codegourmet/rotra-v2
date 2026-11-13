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
      expect(result.error).toBeNull()
      expect(result.matches.flatMap(allPlayers).some((id) => playing.includes(id))).toBe(false)
    }
    expect(input.ctx).toEqual(before)
  })
  it('Plan Ahead uses available players first and includes dependencies when needed', () => {
    const input = scenario()
    input.ctx.roster = input.ctx.roster.map((p, i) => ({ ...p, present: i < 5 }))
    const available = generateAutoQueueMatches({ ...input, mode: 'available', limit: 2 })
    // D-2026-11-13-07: the present player already in a waiting match is left out and said so.
    expect(available.error).toBe(
      'Made 0 of 2: not enough free players for another match · 1 player is already in the Main Queue',
    )
    // Queued players stay out of Plan Ahead too; with an empty Main Queue it reaches the players in play.
    const ahead = generateAutoQueueMatches({
      ...input,
      ctx: { ...input.ctx, matches: input.ctx.matches.filter((m) => m.state !== 'waiting') },
      mode: 'ahead',
      limit: 2,
    })
    expect(ahead.error).toBeNull()
    expect(ahead.matches.flatMap(allPlayers)).toContain(input.ctx.roster[4]?.id)
  })
  it('reuses players in later matches and observes enabled formats', () => {
    const input = scenario()
    input.ctx.roster = input.ctx.roster.slice(4, 9).filter((p) => p.present)
    input.ctx.matches = []
    const result = generateAutoQueueMatches({ ...input, mode: 'available', limit: 6 })
    expect(result.matches).toHaveLength(6)
    expect(result.stopReason).toBe('Made 6 of 6 matches.')
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
    const wait = generateAutoQueueMatches({ ...input, mode: 'wait', limit: 1 })
    const fewest = generateAutoQueueMatches({ ...input, mode: 'fewest', limit: 1 })
    expect(allPlayers(wait.matches[0]!)).toEqual(players.slice(0, 2).map((p) => p.id))
    expect(allPlayers(fewest.matches[0]!)).toEqual(players.slice(2).map((p) => p.id))
    expect(generateAutoQueueMatches({ ...input, mode: 'fewest', limit: 1 })).toEqual(fewest)
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
  it('never counts players already in the Main Queue and says how many were left out (D-2026-11-13-07)', () => {
    const input = scenario()
    const players = input.ctx.roster.slice(0, 6).map((p) => ({ ...p, present: true }))
    input.ctx.roster = players
    const waiting = input.ctx.matches.find((m) => m.state === 'waiting')!
    input.ctx.matches = [
      {
        ...waiting,
        format: 'singles',
        teamA: [players[0]!.id],
        teamB: [players[1]!.id],
        substitutions: [],
      },
    ]
    for (const mode of ['available', 'ahead', 'wait', 'fewest'] as const) {
      const result = generateAutoQueueMatches({ ...input, mode, limit: 2 })
      const used = result.matches.flatMap(allPlayers)
      expect(used).not.toContain(players[0]!.id)
      expect(used).not.toContain(players[1]!.id)
    }
    input.session.allowSingles = false
    const short = generateAutoQueueMatches({ ...input, mode: 'available', limit: 2 })
    expect(short.matches).toHaveLength(2)
    expect(short.stopReason).toBe('Made 2 of 2 matches.')
    input.ctx.roster = players.slice(0, 5)
    const none = generateAutoQueueMatches({ ...input, mode: 'available', limit: 2 })
    expect(none.error).toBe(
      'Made 0 of 2: not enough free players for another match · 2 players are already in the Main Queue',
    )
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
    const result = generateAutoQueueMatches(input)
    expect(result.matches).toHaveLength(1)
    expect(result.remainingShortfall).toBe(0)
    expect(result.stopReason).toBe(
      `Everyone available reaches ${input.catchUpTarget} game${input.catchUpTarget === 1 ? '' : 's'} with these matches.`,
    )
    expect(input.ctx.matches).toEqual(before)
  })
  it('stops without a match when everyone is already at the target', () => {
    const input = catchUp()
    input.catchUpTarget = 1
    expect(generateAutoQueueMatches(input).matches).toHaveLength(0)
    expect(generateAutoQueueMatches(input).stopReason).toBe(
      `Everyone available reaches ${input.catchUpTarget} game${input.catchUpTarget === 1 ? '' : 's'} with these matches.`,
    )
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
    expect(generateAutoQueueMatches(input).matches).toHaveLength(0)
    input.ctx.matches.pop()
    expect(generateAutoQueueMatches(input).matches).toHaveLength(1)
  })
  it('reuses players who are further behind and stops at the explicit cap', () => {
    const input = catchUp()
    input.catchUpTarget = 10
    input.limit = 2
    const result = generateAutoQueueMatches(input)
    expect(result.matches).toHaveLength(2)
    expect(result.stopReason).toBe(
      'Made 2 of 2 matches. 26 more games are still needed to reach 10.',
    )
    expect(result.remainingShortfall).toBeGreaterThan(0)
  })
  it('explains inability to progress and never uses in-play fillers', () => {
    const input = catchUp()
    input.ctx.roster = input.ctx.roster.slice(0, 3)
    const result = generateAutoQueueMatches(input)
    expect(result.matches).toHaveLength(0)
    expect(result.stopReason).toBe(
      'Made 0 of 6: not enough free players for another match. 2 more games are still needed to reach 2.',
    )
  })
  it('requires an explicit positive whole-number target', () => {
    for (const target of [undefined, 0, 1.5, NaN]) {
      expect(generateAutoQueueMatches({ ...catchUp(), catchUpTarget: target }).error).toContain(
        'Enter a whole number of games, 1 or more.',
      )
    }
  })
})
