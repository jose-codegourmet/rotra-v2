import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { editAutoQueueDrafts, generateAutoQueueDrafts, getAutoQueueDrafts, transferAutoQueueDrafts } from './autoQueue.mutations'
import { allAutoQueueDrafts, autoQueuePlayerCounts } from './autoQueue.rules'
import { allPlayers } from './match.rules'
import { matchContext, removeWaitingMatch } from './queue.mutations'
import { startMatch } from './control'

const now = Date.now(), fixture = createConsoleFixtures(now), sessionId = fixture.session.id
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
async function generate(mode: 'available' | 'ahead' = 'available') {
  await generateAutoQueueDrafts({ sessionId, mode, count: 2 })
  return (await getAutoQueueDrafts(sessionId)).batches[mode]!.drafts
}
describe('draft isolation and atomic transfer', () => {
  it('retains cross-tab selection order and transfers only the reviewed IDs', async () => {
    const available = await generate(), ahead = await generate('ahead')
    const ids = [ahead[0]!.id, available[1]!.id]
    for (const draftId of ids) await editAutoQueueDrafts({ sessionId, action: 'select', draftId, selected: true })
    expect((await getAutoQueueDrafts(sessionId)).selectedIds).toEqual(ids)
    expect(readMockState().matches).toEqual(fixture.matches)
    const result = await transferAutoQueueDrafts({ sessionId, draftIds: ids, operationId: 'transfer-order' })
    expect(result.data.map(allPlayers)).toEqual([ahead[0], available[1]].map((d) => allPlayers(d!)))
    expect(result.data[0]!.matchNo).toBeLessThan(result.data[1]!.matchNo)
    const state = await getAutoQueueDrafts(sessionId)
    expect(state.selectedIds).toEqual([])
    expect(allAutoQueueDrafts(state)).toHaveLength(2)
  })
  it('replays a confirmation without appending and permits a separately generated rematch', async () => {
    const drafts = await generate(), input = { sessionId, draftIds: [drafts[0]!.id], operationId: 'repeat' }
    const first = await transferAutoQueueDrafts(input)
    const count = readMockState().matches.length
    expect(await transferAutoQueueDrafts(input)).toEqual(first)
    expect(readMockState().matches).toHaveLength(count)
    await expect(transferAutoQueueDrafts({ ...input, operationId: 'new-confirmation' })).rejects.toThrow('already added')
    const next = await generate()
    await transferAutoQueueDrafts({ sessionId, draftIds: [next[0]!.id], operationId: 'rematch' })
    expect(readMockState().matches).toHaveLength(count + 1)
  })
  it('fails all-or-nothing and keeps selections when a selected player is no longer present', async () => {
    const drafts = await generate(), ids = drafts.map((d) => d.id)
    for (const draftId of ids) await editAutoQueueDrafts({ sessionId, action: 'select', draftId, selected: true })
    mockStore.update((s) => { s.roster.find((p) => p.id === allPlayers(drafts[1]!)[0])!.present = false })
    const before = readMockState()
    await expect(transferAutoQueueDrafts({ sessionId, draftIds: ids, operationId: 'conflict' })).rejects.toThrow('not present')
    expect(readMockState()).toEqual(before)
  })
  it('keeps selected lineups fixed while regenerating and clearing unselected drafts', async () => {
    const drafts = await generate(), selected = drafts[0]!
    await editAutoQueueDrafts({ sessionId, action: 'select', draftId: selected.id, selected: true })
    await generateAutoQueueDrafts({ sessionId, mode: 'available', count: 4, preserveSelected: true })
    const regenerated = await getAutoQueueDrafts(sessionId)
    expect(regenerated.batches.available!.drafts[0]).toEqual(selected)
    await editAutoQueueDrafts({ sessionId, action: 'clear', mode: 'available', unselectedOnly: true })
    expect((await getAutoQueueDrafts(sessionId)).batches.available!.drafts).toEqual([selected])
    expect(readMockState().matches).toEqual(fixture.matches)
  })
  it('derives queued counts immediately on deletion and start without adding played credit', async () => {
    const drafts = await generate(), id = allPlayers(drafts[0]!)[0]!
    const before = autoQueuePlayerCounts(id, matchContext(readMockState(), sessionId), drafts)
    const waiting = readMockState().matches.find((m) => m.state === 'waiting' && allPlayers(m).includes(id))
    if (waiting) {
      await removeWaitingMatch({ sessionId, matchId: waiting.id })
      expect(autoQueuePlayerCounts(id, matchContext(readMockState(), sessionId), drafts).queued).toBe(before.queued - 1)
    }
    const result = await transferAutoQueueDrafts({ sessionId, draftIds: [drafts[0]!.id], operationId: 'count' })
    const preStart = autoQueuePlayerCounts(id, matchContext(readMockState(), sessionId), drafts)
    await startMatch({ matchId: result.data[0]!.id, courtIds: [fixture.courts[1]!.id], operationId: 'start-count' })
    const after = autoQueuePlayerCounts(id, matchContext(readMockState(), sessionId), drafts)
    expect(after.queued).toBe(preStart.queued - 1)
    expect(after.played).toBe(preStart.played)
  })
})
