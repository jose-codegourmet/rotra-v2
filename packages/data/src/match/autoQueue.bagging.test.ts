import { describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import type { PlayingLevel } from '../player/player.types'
import { shortName } from '../session-roster/sessionRoster.rules'
import {
  baggingPairApplies,
  editBagging,
  emptyBaggingSettings,
  generateAutoQueueMatches,
  toggleBaggingGame,
} from './autoQueue.rules'
import type { BaggingPair, BaggingSettings } from './autoQueue.types'
import { allPlayers } from './match.rules'
import type { MatchLineup } from './match.types'

const now = 1800000000000
/** Eight present players with the same level and no games; no matches, so load and wait are equal. */
function scenario(count = 8) {
  const { session, ...ctx } = createConsoleFixtures(now)
  ctx.roster = ctx.roster.slice(0, count).map((p) => ({
    ...p,
    present: true,
    level: 'intermediate_mid' as PlayingLevel,
    presentChangedAt: session.startedAt,
    gamesAdjustment: 0,
  }))
  ctx.matches = []
  session.allowDoubles = true
  session.allowSingles = false
  session.minimumGames = 4
  return { session, ctx, now, rng: () => 0.8 }
}
const id = (ctx: { roster: { id: string }[] }, i: number) => {
  const p = ctx.roster[i]
  if (!p) throw new Error('Missing roster fixture.')
  return p.id
}
const pair = (a: string, b: string, games: BaggingPair['games'] = 'all'): BaggingPair => ({
  id: `pair-${a}-${b}`,
  a,
  b,
  games,
})
const on = (...pairs: BaggingPair[]): BaggingSettings => ({ enabled: true, pairs })
const sameTeam = (m: MatchLineup, a: string, b: string) =>
  (m.teamA.includes(a) && m.teamA.includes(b)) || (m.teamB.includes(a) && m.teamB.includes(b))

describe('Bagging mode in Generate matches (#739)', () => {
  it('ignores the list while the switch is off, and without doubles', () => {
    const input = scenario()
    const [a, b] = [id(input.ctx, 6), id(input.ctx, 7)]
    const plain = generateAutoQueueMatches({ ...input, mode: 'available', limit: 1 })
    const off = generateAutoQueueMatches({
      ...input,
      mode: 'available',
      limit: 1,
      bagging: { enabled: false, pairs: [pair(a, b)] },
    })
    expect(off.matches).toEqual(plain.matches)
    expect(allPlayers(off.matches[0]!)).not.toContain(a)
    input.session.allowDoubles = false
    input.session.allowSingles = true
    const singles = generateAutoQueueMatches({
      ...input,
      mode: 'available',
      limit: 1,
      bagging: on(pair(a, b)),
    })
    expect(singles.matches[0]?.reason).toBeUndefined()
  })
  it('an applicable pair with both players free leads the next doubles draft, on one team, with the reason', () => {
    const input = scenario()
    const [a, b] = [id(input.ctx, 6), id(input.ctx, 7)]
    const result = generateAutoQueueMatches({
      ...input,
      mode: 'available',
      limit: 1,
      bagging: on(pair(a, b)),
    })
    const draft = result.matches[0]!
    expect(allPlayers(draft)).toEqual(expect.arrayContaining([a, b]))
    expect(sameTeam(draft, a, b)).toBe(true)
    expect(draft.reason).toBe(
      `Bagging pair: ${shortName(input.ctx.roster[6]!)} and ${shortName(input.ctx.roster[7]!)} are partners`,
    )
  })
  it('swaps a free partner in for the last unpaired pick, keeping the court at four', () => {
    const input = scenario()
    const [p0, p1, p5, p6, p7] = [0, 1, 5, 6, 7].map((i) => id(input.ctx, i))
    // The lead pair takes the court; the first two fill-ins would be p0 and p1. p0 is paired with p5,
    // who is free, so p5 replaces p1.
    const result = generateAutoQueueMatches({
      ...input,
      mode: 'available',
      limit: 1,
      bagging: on(pair(p6!, p7!), pair(p0!, p5!)),
    })
    const draft = result.matches[0]!
    expect(allPlayers(draft)).toHaveLength(4)
    expect(allPlayers(draft).sort()).toEqual([p0, p5, p6, p7].sort())
    expect(allPlayers(draft)).not.toContain(p1)
    expect(sameTeam(draft, p6!, p7!)).toBe(true)
    expect(sameTeam(draft, p0!, p5!)).toBe(true)
    expect(draft.reason).toMatch(/^Bagging pair: .+ and .+, .+ and .+ are partners$/)
  })
  it('puts a pair picked together on one team even when level balance would split them', () => {
    const input = scenario(4)
    const levels: PlayingLevel[] = [
      'advanced_high',
      'advanced_high',
      'beginner_low',
      'beginner_low',
    ]
    input.ctx.roster = input.ctx.roster.map((p, i) => ({
      ...p,
      level: levels[i] ?? ('intermediate_mid' as PlayingLevel),
    }))
    const [a, b] = [id(input.ctx, 0), id(input.ctx, 1)]
    const plain = generateAutoQueueMatches({ ...input, mode: 'available', limit: 1 })
    expect(sameTeam(plain.matches[0]!, a, b)).toBe(false)
    const bagged = generateAutoQueueMatches({
      ...input,
      mode: 'available',
      limit: 1,
      bagging: on(pair(a, b)),
    })
    expect(sameTeam(bagged.matches[0]!, a, b)).toBe(true)
  })
  it('generates the player normally when the partner is playing or already in a draft', () => {
    const playing = scenario()
    const [a, b] = [id(playing.ctx, 0), id(playing.ctx, 6)]
    const active = createConsoleFixtures(now).matches.find((m) => m.state === 'active')!
    playing.ctx.matches = [
      {
        ...active,
        format: 'doubles',
        teamA: [b, id(playing.ctx, 7)],
        teamB: [id(playing.ctx, 4), id(playing.ctx, 5)],
      },
    ]
    const result = generateAutoQueueMatches({
      ...playing,
      mode: 'available',
      limit: 1,
      bagging: on(pair(a, b)),
    })
    expect(allPlayers(result.matches[0]!)).toContain(a)
    expect(allPlayers(result.matches[0]!)).not.toContain(b)
    expect(result.matches[0]?.reason).toBeUndefined()

    // Six players: the pair leads draft 1; in draft 2 the first player is picked again but the
    // partner is already in a draft, so no swap happens and the draft carries no bagging reason.
    const drafted = scenario(6)
    const [c, d] = [id(drafted.ctx, 0), id(drafted.ctx, 5)]
    const two = generateAutoQueueMatches({
      ...drafted,
      mode: 'available',
      limit: 2,
      bagging: on(pair(c, d)),
    })
    expect(two.matches).toHaveLength(2)
    expect(sameTeam(two.matches[0]!, c, d)).toBe(true)
    expect(allPlayers(two.matches[1]!)).toContain(c)
    expect(allPlayers(two.matches[1]!)).not.toContain(d)
    expect(two.matches[1]?.reason).toBeUndefined()
  })
  it('applies a game-number pattern to the pair’s next game together, counted on games played with the adjustment', () => {
    const input = scenario()
    const [a, b] = [id(input.ctx, 6), id(input.ctx, 7)]
    const games = (ga: number, gb: number) => {
      const ctx = {
        ...input.ctx,
        roster: input.ctx.roster.map((p) =>
          p.id === a
            ? { ...p, gamesAdjustment: ga }
            : p.id === b
              ? { ...p, gamesAdjustment: gb }
              : p,
        ),
      }
      return ctx
    }
    // Next game together is the lower count + 1: 1 here, so Game 2 does not apply yet.
    expect(baggingPairApplies(pair(a, b, [2]), games(0, 0), 4)).toBe(false)
    expect(baggingPairApplies(pair(a, b, [1]), games(0, 0), 4)).toBe(true)
    expect(baggingPairApplies(pair(a, b, [2]), games(3, 1), 4)).toBe(true)
    expect(baggingPairApplies(pair(a, b, [4]), games(3, 3), 4)).toBe(true)
    // Games past the minimum count only under ALL.
    expect(baggingPairApplies(pair(a, b, [4]), games(4, 4), 4)).toBe(false)
    expect(baggingPairApplies(pair(a, b, 'all'), games(4, 4), 4)).toBe(true)
    const skipped = generateAutoQueueMatches({
      ...input,
      mode: 'available',
      limit: 1,
      bagging: on(pair(a, b, [2])),
    })
    expect(skipped.matches[0]?.reason).toBeUndefined()
    const applied = generateAutoQueueMatches({
      ...input,
      ctx: games(1, 2),
      mode: 'available',
      limit: 1,
      bagging: on(pair(a, b, [2])),
    })
    expect(sameTeam(applied.matches[0]!, a, b)).toBe(true)
  })
  it('guides Catch Up like every other tab', () => {
    const input = scenario()
    const [a, b] = [id(input.ctx, 6), id(input.ctx, 7)]
    const result = generateAutoQueueMatches({
      ...input,
      mode: 'catchup',
      catchUpTarget: 1,
      limit: 2,
      bagging: on(pair(a, b)),
    })
    expect(result.error).toBeNull()
    expect(sameTeam(result.matches[0]!, a, b)).toBe(true)
  })
  it('ALL is every number or none; a player is in one pair at a time', () => {
    expect(toggleBaggingGame('all', 2, 4)).toEqual([2])
    expect(toggleBaggingGame([2], 4, 4)).toEqual([2, 4])
    expect(toggleBaggingGame([2, 4], 2, 4)).toEqual([4])
    expect(toggleBaggingGame([4], 4, 4)).toBe('all')
    expect(toggleBaggingGame([1, 2, 3], 4, 4)).toBe('all')
    expect(toggleBaggingGame([1, 3], 'all', 4)).toBe('all')

    const bagging = emptyBaggingSettings()
    editBagging(bagging, { action: 'bagging-enabled', enabled: true })
    const first = editBagging(bagging, { action: 'bagging-add', a: 'p1', b: 'p2', games: 'all' })
    editBagging(bagging, { action: 'bagging-add', a: 'p3', b: 'p4', games: [1, 3] })
    expect(bagging.pairs).toHaveLength(2)
    // Replace pair: p2 moves to p5, so the p1 and p2 pair goes.
    const replaced = editBagging(bagging, { action: 'bagging-add', a: 'p5', b: 'p2', games: 'all' })
    expect(bagging.pairs.map((p) => [p.a, p.b])).toEqual([
      ['p3', 'p4'],
      ['p5', 'p2'],
    ])
    expect(bagging.pairs.some((p) => p.id === first?.id)).toBe(false)
    editBagging(bagging, { action: 'bagging-games', pairId: replaced!.id, games: [2] })
    expect(bagging.pairs[1]?.games).toEqual([2])
    expect(editBagging(bagging, { action: 'bagging-remove', pairId: replaced!.id })?.a).toBe('p5')
    expect(bagging.pairs).toHaveLength(1)
    expect(() =>
      editBagging(bagging, { action: 'bagging-add', a: 'p1', b: 'p1', games: 'all' }),
    ).toThrow('Pick two different players.')
    editBagging(bagging, { action: 'bagging-enabled', enabled: false })
    expect(bagging).toEqual({ enabled: false, pairs: [expect.objectContaining({ a: 'p3' })] })
  })
})
