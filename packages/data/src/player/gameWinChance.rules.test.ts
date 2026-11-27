import { describe, expect, it } from 'vitest'
import {
  drawnWinChanceBreakdown,
  gameFaceKey,
  gameWinChanceBreakdown,
  gameWinChanceFields,
} from './gameWinChance.rules'

const mid = { level: 'intermediate_mid' } as const
const high = { level: 'advanced_high' } as const

describe('gameWinChanceBreakdown', () => {
  it('reads the left side as Team A from the lasting signals only', () => {
    const b = gameWinChanceBreakdown('doubles', [mid, mid], [high, high], 'right')
    expect(b?.lasting).toBe(true)
    expect(b?.chance.favored).toBe('B')
    expect(b?.chance.strong).toBe(true)
    expect(b?.upset).toBe(false)
    expect(b?.teamA.players.map((p) => p.id)).toEqual([gameFaceKey('a', 0), gameFaceKey('a', 1)])
    expect(b?.teamA.players[0]?.rows.map((r) => r.key)).toEqual(['level', 'club_win_rate'])
  })
  it('marks an Upset when the Favored side lost', () => {
    expect(gameWinChanceBreakdown('doubles', [mid, mid], [high, high], 'left')?.upset).toBe(true)
  })
  it('uses the form a face carries', () => {
    const form = { clubWinRate: 1, bestDay: true, place: 1, trend: 1 } as const
    const b = gameWinChanceBreakdown('singles', [{ ...mid, form }], [mid], 'left')
    expect(b?.teamA.average).toBe(4 + 1 + 0.75)
    expect(b?.chance.a).toBeGreaterThan(b?.chance.b ?? 100)
  })
  it('has nothing without two sides', () => {
    expect(gameWinChanceBreakdown('singles', [mid], [], 'left')).toBeNull()
  })
})

describe('gameWinChanceFields', () => {
  const game = { format: 'doubles', counting: 'counted', result: 'won' } as const
  it('gives the pill and the upset of a counted game', () => {
    expect(gameWinChanceFields(game, [mid, mid], [high, high])).toEqual({
      winChance: gameWinChanceBreakdown('doubles', [mid, mid], [high, high], 'left')?.chance,
      upset: true,
    })
  })
  it('gives nothing for a partial game or one side', () => {
    expect(gameWinChanceFields({ ...game, counting: 'partial' }, [mid], [high])).toEqual({})
    expect(gameWinChanceFields(game, [mid], [])).toEqual({})
  })
  it('keeps a fun game', () => {
    expect(
      gameWinChanceFields({ ...game, format: 'fun_3v3', counting: 'fun' }, [mid], [mid]).winChance,
    ).toMatchObject({ a: 50, b: 50, favored: null })
  })
})

describe('drawnWinChanceBreakdown', () => {
  const b = gameWinChanceBreakdown('doubles', [mid, mid], [high, mid], 'left')
  if (!b) throw new Error('no breakdown')
  it('keeps Team A on the left in the drawn order', () => {
    const drawn = drawnWinChanceBreakdown(b, ['a1', 'a0'], ['b0', 'b1'])
    expect(drawn?.chance).toEqual(b.chance)
    expect(drawn?.teamA.players.map((p) => p.id)).toEqual(['a1', 'a0'])
  })
  it('turns the sides round when Team B is drawn on the left', () => {
    const drawn = drawnWinChanceBreakdown(b, ['b1', 'b0'], ['a0', 'a1'])
    expect(drawn?.chance.a).toBe(b.chance.b)
    expect(drawn?.chance.favored).toBe('A')
    expect(drawn?.teamA.average).toBe(b.teamB.average)
    expect(drawn?.upset).toBe(b.upset)
  })
  it('is null when the faces are not the breakdown’s', () => {
    expect(drawnWinChanceBreakdown(b, ['a0'], ['b0', 'b1'])).toBeNull()
    expect(drawnWinChanceBreakdown(b, [], ['b0', 'b1'])).toBeNull()
  })
})
