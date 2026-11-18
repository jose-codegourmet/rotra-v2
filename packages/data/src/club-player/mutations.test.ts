import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { directoryPlayers } from '../fixtures/players'
import { unclaimedFixtures } from '../fixtures/unclaimedPlayers'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { lookupPlayer, playerDirectorySearch } from '../session-roster/mutations'
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
  it('saves a new player without an email as a guest, added now, with no session rows', async () => {
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

  it('saves a new player with an email as unclaimed with a new RTR ID, and stores the level', async () => {
    const before = stats()
    const result = await addNewSavedPlayer({
      name: 'Email Player',
      email: 'email.player@example.com',
      level: 'advanced_mid',
    })
    const s = readMockState()
    const saved = s.clubPlayers.find((p) => p.id === result.data.clubPlayerId)
    expect(saved).toMatchObject({ identity: 'unclaimed', playingLevel: 'advanced_mid' })
    const person = s.players.find((p) => p.id === saved?.playerId)
    expect(person?.rtrId).toMatch(/^RTR-PH-CEB-\d{6}-\d{4}$/)
    expect(s.playerAccounts.find((a) => a.playerId === person?.id)).toMatchObject({
      email: 'email.player@example.com',
      claimed: false,
    })
    expect(result.message).toBe(`Email Player saved · unclaimed · ${person?.rtrId}`)
    expect(stats().totalAdvanced).toBe(before.totalAdvanced + 1)
  })

  it('refuses an email a saved player already has, links one already on ROTRA, and keeps same-name guests apart', async () => {
    await addNewSavedPlayer({ name: 'First', email: 'first@example.com' })
    await expect(addNewSavedPlayer({ name: 'Second', email: 'first@example.com' })).rejects.toThrow(
      'That email is already First in your saved players.',
    )
    const other = await addNewSavedPlayer({
      name: 'Ivan',
      email: unclaimedFixtures.otherClubEmail,
    })
    expect(other.message).toBe(
      `Ivan saved · already on ROTRA · ${unclaimedFixtures.otherClubRtrId}`,
    )
    const linked = await addNewSavedPlayer({
      name: 'Cam',
      email: unclaimedFixtures.registeredEmail,
    })
    expect(linked.message).toBe('Cam saved · linked to their ROTRA account')
    await addNewSavedPlayer({ name: 'Same Name' })
    await addNewSavedPlayer({ name: 'Same Name' })
    expect(readMockState().clubPlayers.filter((p) => p.fullName === 'Same Name')).toHaveLength(2)
  })

  it('saves a Player Information profile as registered and refuses it the second time', async () => {
    const [profile] = await playerDirectorySearch(unclaimedFixtures.registeredRtrId)
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
    expect(await playerDirectorySearch(unclaimedFixtures.registeredRtrId)).toEqual([])
    expect((await lookupPlayer(unclaimedFixtures.registeredRtrId)).savedName).toBe(profile.fullName)
  })

  it("saves another club's unclaimed player under this club's own name", async () => {
    const found = (await lookupPlayer(unclaimedFixtures.otherClubRtrId)).player
    if (!found) throw new Error('No unclaimed player of another club in the fixtures')
    expect(found).toMatchObject({
      identity: 'unclaimed',
      fullName: '',
      picture: null,
      suggestion: null,
      ownNameRequired: true,
    })
    await expect(addDirectoryPlayerToClub({ playerId: found.id })).rejects.toThrow('Enter a name.')
    const result = await addDirectoryPlayerToClub({ playerId: found.id, name: 'Ivan D.' })
    expect(
      readMockState().clubPlayers.find((p) => p.id === result.data.clubPlayerId),
    ).toMatchObject({
      playerId: found.id,
      identity: 'unclaimed',
      fullName: 'Ivan D.',
      playingLevel: null,
    })
    expect(await lookupPlayer(unclaimedFixtures.otherClubEmail)).toEqual({
      player: null,
      savedName: 'Ivan D.',
    })
  })

  it('saves a profile with no level yet when the level is null', async () => {
    const [profile] = await playerDirectorySearch(directoryPlayers[1]?.rtrId ?? '')
    if (!profile) throw new Error('No unsaved directory profile in the fixtures')
    const result = await addDirectoryPlayerToClub({ playerId: profile.id, level: null })
    expect(
      readMockState().clubPlayers.find((p) => p.id === result.data.clubPlayerId)?.playingLevel,
    ).toBeNull()
  })
})
