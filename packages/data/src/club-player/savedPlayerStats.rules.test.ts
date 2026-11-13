import { describe, expect, it } from 'vitest'
import { clubPlayers } from '../fixtures/players'

describe('Saved player statistics', () => {
  it('preserves every fixture player', () => {
    // 23 registered demo-club players, the club-only unclaimed Gab Torres and the second-club row.
    expect(new Set(clubPlayers.map((entry) => entry.id)).size).toBe(25)
  })
})
