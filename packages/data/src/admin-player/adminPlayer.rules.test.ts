import { describe, expect, it } from 'vitest'
import { playerAccounts } from '../fixtures/playerAccounts'
import { JOSE_PLAYER_ID, players } from '../fixtures/players'
import { rankingSettings } from '../fixtures/rankingSettings'
import {
  createdOnFromRtrId,
  matchesAccountFilter,
  matchesAdminPlayerSearch,
  rankStatusOf,
  sameNameGroups,
} from './adminPlayer.rules'

// Adapted to the real demo pool (user decision, 2026-10-30): the prototype's Miguel Santos phone
// example uses Jose (same RTR ID and phone, +63 917 555 0142), and the 'Carlo Medina' twins are
// test-only input because no two real players share a name.
const jose = players.find((player) => player.id === JOSE_PLAYER_ID)
const joseAccount = playerAccounts.find((account) => account.playerId === JOSE_PLAYER_ID)
if (!jose || !joseAccount) throw new Error('fixture missing')
const joseRow = {
  name: jose.fullName,
  nickname: jose.nickname,
  rtrId: jose.rtrId,
  phone: joseAccount.phone,
  email: joseAccount.email,
}
const threshold = rankingSettings.matchRequirement

describe('rank status (rotra-admin.html rankOf)', () => {
  it('no level is no rank yet', () => {
    expect(rankStatusOf(null, 30, threshold)).toEqual({ kind: 'none', text: 'No rank yet' })
  })
  it('below the requirement names the level and the count', () => {
    expect(rankStatusOf(3, 9, 10)).toEqual({
      kind: 'below',
      text: 'Intermediate Low · 9 of 10 recent matches',
    })
  })
  it('meeting the requirement is on the leaderboard', () => {
    expect(rankStatusOf(8, 10, 10)).toEqual({
      kind: 'board',
      text: 'Advanced High · on the overall leaderboard',
    })
  })
  it('an unknown level index is no rank yet', () => {
    expect(rankStatusOf(9, 12, 10).kind).toBe('none')
  })
})

describe('privileged search (rotra-admin.html playerMatches)', () => {
  it('an empty query matches everyone', () => {
    expect(matchesAdminPlayerSearch(joseRow, '  ')).toBe(true)
  })
  it('matches name, RTR ID and email, ignoring case and accents', () => {
    expect(matchesAdminPlayerSearch(joseRow, 'JOSÉ')).toBe(true)
    expect(matchesAdminPlayerSearch(joseRow, 'rtr-ph-ceb-031526-0001')).toBe(true)
    expect(matchesAdminPlayerSearch(joseRow, 'jose@example')).toBe(true)
  })
  it('matches the nickname', () => {
    const steph = { name: 'Maria Steph', nickname: 'Atty Steph', rtrId: 'RTR-PH-CEB-061126-0105' }
    expect(matchesAdminPlayerSearch(steph, 'atty')).toBe(true)
  })
  it('a local 0917 number finds the +63 phone', () => {
    expect(matchesAdminPlayerSearch(joseRow, '0917 555 0142')).toBe(true)
    expect(matchesAdminPlayerSearch(joseRow, '+63 917 555 0142')).toBe(true)
    expect(matchesAdminPlayerSearch(joseRow, '0142')).toBe(true)
  })
  it('fewer than four digits never searches phones', () => {
    expect(matchesAdminPlayerSearch(joseRow, '142')).toBe(false)
    expect(matchesAdminPlayerSearch({ ...joseRow, rtrId: 'RTR-X' }, '917')).toBe(false)
  })
  it('a player without a phone is not matched by digits', () => {
    expect(matchesAdminPlayerSearch({ ...joseRow, phone: undefined }, '0917 555 0142')).toBe(false)
  })
})

describe('account filter', () => {
  it('splits registered and unclaimed', () => {
    expect(matchesAccountFilter(true)).toBe(true)
    expect(matchesAccountFilter(true, 'registered')).toBe(true)
    expect(matchesAccountFilter(true, 'unclaimed')).toBe(false)
    expect(matchesAccountFilter(false, 'unclaimed')).toBe(true)
  })
})

describe('same-name detection', () => {
  it('flags exact duplicates only (test-only twins)', () => {
    expect(
      sameNameGroups([
        { name: 'Carlo Medina' },
        { name: 'Jose' },
        { name: 'Carlo Medina' },
        { name: 'carlo medina' },
      ]),
    ).toEqual([{ name: 'Carlo Medina', count: 2 }])
  })
  it('the real pool has no shared names', () => {
    expect(sameNameGroups(players.map((player) => ({ name: player.fullName })))).toEqual([])
  })
})

describe('created date from the RTR ID', () => {
  it('reads the MMDDYY segment', () => {
    expect(createdOnFromRtrId('RTR-PH-CEB-031526-0001')).toBe('2026-03-15')
  })
  it('is empty for a malformed ID', () => {
    expect(createdOnFromRtrId('RTR-PH-CEB')).toBe('')
  })
})
