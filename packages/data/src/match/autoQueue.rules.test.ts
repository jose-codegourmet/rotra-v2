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
    const input = scenario(), before = structuredClone(input.ctx)
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
    expect(available.error).toContain('needs 4')
    const ahead = generateAutoQueueMatches({ ...input, mode: 'ahead', limit: 2 })
    expect(ahead.error).toBeNull()
    expect(ahead.matches.flatMap(allPlayers)).toContain(input.ctx.roster[4]?.id)
  })
  it('reuses players in later matches and observes enabled formats', () => {
    const input = scenario()
    input.ctx.roster = input.ctx.roster.slice(4, 9).filter((p) => p.present)
    input.ctx.matches = []
    const result = generateAutoQueueMatches({ ...input, mode: 'available', limit: 6 })
    expect(result.matches).toHaveLength(6)
    expect(new Set(result.matches.flatMap(allPlayers)).size).toBe(4)
    expect(result.matches.every((m) => m.format === 'doubles')).toBe(true)
  })
  it('distinguishes longest wait from fewest completed games with stable ties', () => {
    const input = scenario()
    const players = input.ctx.roster.slice(0, 4).map((p) => ({ ...p, present: true, presentChangedAt: now - 3600000 }))
    input.ctx.roster = players
    const completed = input.ctx.matches.find((m) => m.state === 'completed')!
    input.ctx.matches = [{ ...completed, format: 'singles', teamA: [players[0]!.id], teamB: [players[1]!.id], substitutions: [], endedAt: now - 1200000 }]
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
    const next = generateAutoQueueMatches({ ...input, mode: 'fewest', limit: 1, retained: first.matches })
    expect(allPlayers(next.matches[0]!)).not.toEqual(allPlayers(first.matches[0]!))
  })
  it('fails clearly when both formats are disabled', () => {
    const input = scenario()
    input.session.allowSingles = input.session.allowDoubles = false
    expect(generateAutoQueueMatches({ ...input, mode: 'available', limit: 2 }).error).toContain('both off')
  })
})
