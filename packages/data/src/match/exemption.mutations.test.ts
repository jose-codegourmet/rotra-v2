import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore } from '../mock/store'
import { generateAutoQueueDrafts, getAutoQueueDrafts } from './autoQueue.mutations'
import {
  addToExemptionList,
  clearExemptionList,
  removeFromExemptionList,
  saveExemptionList,
} from './exemption.mutations'
import { getExemptionList } from './fetchers'
import { allPlayers } from './match.rules'

const fixture = createConsoleFixtures(Date.now()),
  sessionId = fixture.session.id
let restoreLatency: () => void
beforeEach(() => {
  restoreLatency = setMockLatencyEnabled(false)
  mockStore.reset()
  mockStore.update((s) => {
    s.sessions = [fixture.session]
    s.roster = fixture.roster
    s.courts = fixture.courts
    s.matches = fixture.matches
  })
})
afterEach(() => restoreLatency())

const present = () => fixture.roster.filter((r) => r.present).map((r) => r.id)

describe('session exemption list', () => {
  it('saves, names one change, counts several and clears', async () => {
    const [a, b, c] = present() as [string, string, string]
    expect((await saveExemptionList({ sessionId, ids: [a, b] })).message).toBe(
      'Exemption list saved · 2 players',
    )
    expect(await getExemptionList(sessionId)).toEqual([a, b])
    expect((await addToExemptionList({ sessionId, id: c })).message).toMatch(
      /^.+ added to the exemption list$/,
    )
    expect((await removeFromExemptionList({ sessionId, id: c })).message).toMatch(
      /^.+ taken off the exemption list$/,
    )
    expect((await clearExemptionList({ sessionId })).message).toBe('Exemption list cleared')
    expect(await getExemptionList(sessionId)).toEqual([])
  })
  it('keeps exempt players out of every generated draft, Plan Ahead included', async () => {
    const exempt = present().slice(0, 3)
    await saveExemptionList({ sessionId, ids: exempt })
    for (const mode of ['available', 'ahead', 'wait', 'fewest'] as const) {
      await generateAutoQueueDrafts({ sessionId, mode, count: 6 })
      const drafts = (await getAutoQueueDrafts(sessionId)).batches[mode]?.drafts ?? []
      for (const d of drafts) for (const id of allPlayers(d)) expect(exempt).not.toContain(id)
    }
  })
})
