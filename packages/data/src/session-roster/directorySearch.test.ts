import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { directoryPlayers } from '../fixtures/players'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore } from '../mock/store'
import { playerDirectorySearch } from './mutations'

describe('Add player › Player Information search › Hide me from Player Information', () => {
  beforeEach(() => {
    mockStore.reset()
    setMockLatencyEnabled(false)
  })
  afterEach(() => {
    mockStore.reset()
    setMockLatencyEnabled(true)
  })

  it('leaves a hidden profile out of name, nickname and RTR ID search', async () => {
    const hidden = directoryPlayers[0]
    if (!hidden) throw new Error('No directory fixture.')
    expect((await playerDirectorySearch(hidden.fullName)).map((p) => p.id)).toContain(hidden.id)
    mockStore.update((draft) => {
      const profile = draft.playerProfiles.find((p) => p.playerId === hidden.id)
      if (!profile) throw new Error('Missing profile fixture.')
      profile.hiddenFromDirectory = true
    })
    expect((await playerDirectorySearch(hidden.fullName)).map((p) => p.id)).not.toContain(hidden.id)
    expect((await playerDirectorySearch(hidden.rtrId)).map((p) => p.id)).not.toContain(hidden.id)
    // Other profiles are still found.
    const other = directoryPlayers[1]
    if (!other) throw new Error('No second directory fixture.')
    expect((await playerDirectorySearch('')).map((p) => p.id)).toContain(other.id)
  })
})
