import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { directoryPlayers } from '../fixtures/players'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore } from '../mock/store'
import { playerDirectorySearch } from './mutations'

describe('Add player › Player Information lookup', () => {
  beforeEach(() => {
    mockStore.reset()
    setMockLatencyEnabled(false)
  })
  afterEach(() => {
    mockStore.reset()
    setMockLatencyEnabled(true)
  })

  it('finds a player by the exact RTR ID only, never by name or part of an RTR ID', async () => {
    const player = directoryPlayers[0]
    if (!player) throw new Error('No directory fixture.')
    expect((await playerDirectorySearch(player.rtrId)).map((p) => p.id)).toEqual([player.id])
    expect(
      (await playerDirectorySearch(` ${player.rtrId.toLowerCase()} `)).map((p) => p.id),
    ).toEqual([player.id])
    expect(await playerDirectorySearch(player.fullName)).toEqual([])
    expect(await playerDirectorySearch(player.rtrId.slice(0, -1))).toEqual([])
    expect(await playerDirectorySearch('')).toEqual([])
  })

  it('leaves a profile hidden from Player Information out of the lookup', async () => {
    const hidden = directoryPlayers[0]
    if (!hidden) throw new Error('No directory fixture.')
    mockStore.update((draft) => {
      const profile = draft.playerProfiles.find((p) => p.playerId === hidden.id)
      if (!profile) throw new Error('Missing profile fixture.')
      profile.hiddenFromDirectory = true
    })
    expect(await playerDirectorySearch(hidden.rtrId)).toEqual([])
    // Other profiles are still found.
    const other = directoryPlayers[1]
    if (!other) throw new Error('No second directory fixture.')
    expect((await playerDirectorySearch(other.rtrId)).map((p) => p.id)).toEqual([other.id])
  })
})
