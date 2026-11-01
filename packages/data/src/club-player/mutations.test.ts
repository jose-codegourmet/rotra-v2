import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { playerDirectorySearch } from '../session-roster/mutations'
import { addDirectoryPlayerToClub, addNewSavedPlayer } from './mutations'
import { deriveSavedPlayerStats } from './savedPlayerStats.rules'

let restoreLatency: () => void
beforeEach(() => {
  restoreLatency = setMockLatencyEnabled(false)
  mockStore.reset()
})
afterEach(() => restoreLatency())

const sessionRows = () => {
  const s = readMockState()
  return { roster: s.roster.length, waitlist: s.waitlist.length }
}
const stats = () => deriveSavedPlayerStats(readMockState().clubPlayers, DEMO_CLUB_ID, Date.now())

describe('Saved players › Add player (no session)', () => {
  it('saves a new player without a phone as a guest, added now, with no session rows', async () => {
    const before = { rows: sessionRows(), stats: stats() }
    const result = await addNewSavedPlayer({ name: 'Test Guest' })
    const saved = readMockState().clubPlayers.find((p) => p.id === result.data.clubPlayerId)
    expect(saved).toMatchObject({ fullName: 'Test Guest', identity: 'guest', playingLevel: null })
    expect(Date.now() - (saved?.addedAt ?? 0)).toBeLessThan(5_000)
    expect(result.message).toBe('Test Guest saved as a guest')
    expect(sessionRows()).toEqual(before.rows)
    expect(stats().totalPlayers).toBe(before.stats.totalPlayers + 1)
    expect(stats().newPlayersThisWeek).toBe(before.stats.newPlayersThisWeek + 1)
  })

  it('saves a new player with a phone as pending, keeps the phone private, and stores the level', async () => {
    const before = stats()
    const result = await addNewSavedPlayer({
      name: 'Phone Player',
      phone: '0917 555 0101',
      level: 'advanced_mid',
    })
    const s = readMockState()
    const saved = s.clubPlayers.find((p) => p.id === result.data.clubPlayerId)
    expect(saved).toMatchObject({ identity: 'pending', playingLevel: 'advanced_mid' })
    expect(s.privatePhones[result.data.clubPlayerId]).toBe('+639175550101')
    expect(result.message).toBe('Phone Player saved · profile lookup after sync')
    expect(stats().totalAdvanced).toBe(before.totalAdvanced + 1)
  })

  it('refuses a phone that a saved player already has, and saves same-name guests separately', async () => {
    await addNewSavedPlayer({ name: 'First', phone: '0917 555 0102' })
    await expect(addNewSavedPlayer({ name: 'Second', phone: '09175550102' })).rejects.toThrow(
      'First is already in your saved players.',
    )
    await addNewSavedPlayer({ name: 'Same Name' })
    await addNewSavedPlayer({ name: 'Same Name' })
    expect(readMockState().clubPlayers.filter((p) => p.fullName === 'Same Name')).toHaveLength(2)
  })

  it('saves a Player Information profile as registered and refuses it the second time', async () => {
    const [profile] = await playerDirectorySearch('')
    if (!profile) throw new Error('No unsaved directory profile in the fixtures')
    const before = { rows: sessionRows(), stats: stats() }
    const result = await addDirectoryPlayerToClub({ playerId: profile.id, level: 'beginner_mid' })
    const saved = readMockState().clubPlayers.find((p) => p.id === result.data.clubPlayerId)
    expect(saved).toMatchObject({
      playerId: profile.id,
      identity: 'registered',
      playingLevel: 'beginner_mid',
    })
    expect(stats().totalRegistered).toBe(before.stats.totalRegistered + 1)
    expect(stats().totalBeginners).toBe(before.stats.totalBeginners + 1)
    expect(sessionRows()).toEqual(before.rows)
    await expect(addDirectoryPlayerToClub({ playerId: profile.id })).rejects.toThrow(
      'is already in your saved players.',
    )
    expect(readMockState().clubPlayers.filter((p) => p.playerId === profile.id)).toHaveLength(1)
    expect((await playerDirectorySearch('')).some((p) => p.id === profile.id)).toBe(false)
  })

  it('saves a profile with no level yet when the level is null', async () => {
    const [profile] = await playerDirectorySearch('')
    if (!profile) throw new Error('No unsaved directory profile in the fixtures')
    const result = await addDirectoryPlayerToClub({ playerId: profile.id, level: null })
    expect(
      readMockState().clubPlayers.find((p) => p.id === result.data.clubPlayerId)?.playingLevel,
    ).toBeNull()
  })
})
