import { describe, expect, it } from 'vitest'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { clubPlayers } from '../fixtures/players'
import { PLAYING_LEVELS } from '../player/player.types'
import type { ClubPlayer } from './clubPlayer.types'
import { deriveSavedPlayerStats, savedPlayerWeekStart } from './savedPlayerStats.rules'

const NOW = Date.parse('2026-10-31T12:00:00+08:00')
const MONDAY = Date.parse('2026-10-26T00:00:00+08:00')
const EMPTY = {
  totalPlayers: 0,
  totalRegistered: 0,
  totalBeginners: 0,
  totalIntermediates: 0,
  totalAdvanced: 0,
  newPlayersThisWeek: 0,
}
const player = (overrides: Partial<ClubPlayer> = {}): ClubPlayer => ({
  id: 'saved-player',
  clubId: 'club-a',
  playerId: null,
  fullName: 'Same name',
  nickname: null,
  identity: 'guest',
  playingLevel: null,
  ...overrides,
})

describe('Saved player statistics', () => {
  it('returns all six zeros for an empty club', () => {
    expect(deriveSavedPlayerStats([], 'club-a', NOW)).toEqual(EMPTY)
    expect(deriveSavedPlayerStats([player()], 'another-club', NOW)).toEqual(EMPTY)
  })

  it('counts all nine levels by band, including same-name players, scoped to one club', () => {
    const players = PLAYING_LEVELS.map((playingLevel, index) =>
      player({ id: `player-${index}`, playingLevel }),
    )
    players.push(player({ id: 'unknown-level' }), player({ clubId: 'club-b' }))
    expect(deriveSavedPlayerStats(players, 'club-a', NOW)).toEqual({
      ...EMPTY,
      totalPlayers: 10,
      totalBeginners: 3,
      totalIntermediates: 3,
      totalAdvanced: 3,
    })
  })

  it('counts only claimed identities as registered', () => {
    const identities: ClubPlayer['identity'][] = ['registered', 'unclaimed', 'guest', 'pending']
    expect(
      deriveSavedPlayerStats(
        identities.map((identity) => player({ id: identity, identity })),
        'club-a',
        NOW,
      ),
    ).toEqual({ ...EMPTY, totalPlayers: 4, totalRegistered: 1 })
  })

  it('includes Monday midnight and now, excludes missing, invalid, past and future dates', () => {
    const dates = [undefined, Number.NaN, Infinity, -Infinity, MONDAY - 1, MONDAY, NOW, NOW + 1]
    expect(
      deriveSavedPlayerStats(
        dates.map((addedAt, index) => player({ id: `date-${index}`, addedAt })),
        'club-a',
        NOW,
      ),
    ).toEqual({ ...EMPTY, totalPlayers: dates.length, newPlayersThisWeek: 2 })
  })

  it.each([
    ['2026-10-25T15:59:59.999Z', '2026-10-18T16:00:00Z'],
    ['2026-10-25T16:00:00.000Z', '2026-10-25T16:00:00Z'],
    ['2026-11-01T15:59:59.999Z', '2026-10-25T16:00:00Z'],
    ['2026-11-01T16:00:00.000Z', '2026-11-01T16:00:00Z'],
    ['2027-01-01T12:00:00+08:00', '2026-12-27T16:00:00Z'],
    ['2028-03-01T12:00:00+08:00', '2028-02-27T16:00:00Z'],
  ])('uses Manila calendar weeks across month/year boundaries: %s', (now, start) => {
    expect(savedPlayerWeekStart(Date.parse(now))).toBe(Date.parse(start))
  })

  it('resets weekly additions at Monday midnight while retaining the other totals', () => {
    const nextMonday = Date.parse('2026-11-02T00:00:00+08:00')
    const players = [player({ addedAt: NOW })]
    expect(deriveSavedPlayerStats(players, 'club-a', nextMonday - 1).newPlayersThisWeek).toBe(1)
    expect(deriveSavedPlayerStats(players, 'club-a', nextMonday)).toEqual({
      ...EMPTY,
      totalPlayers: 1,
    })
  })

  it('preserves all 23 fixture players and supplies meaningful values for every statistic', () => {
    const now = Math.max(...clubPlayers.map((entry) => entry.addedAt))
    expect(new Set(clubPlayers.map((entry) => entry.id)).size).toBe(23)
    expect(deriveSavedPlayerStats(clubPlayers, DEMO_CLUB_ID, now)).toEqual({
      totalPlayers: 23,
      totalRegistered: 23,
      totalBeginners: 2,
      totalIntermediates: 14,
      totalAdvanced: 7,
      newPlayersThisWeek: 3,
    })
  })
})
