import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import type { MatchFormat } from './match.types'
import { clearQueue, makeMatch } from './queue.mutations'
import { arrangeToBalance, balanceTeams, previewMakeMatch } from './queue.rules'
import { matchesPlayerText, queueSearchHitCount } from './queueSearch.rules'

const fixture = createConsoleFixtures()
let restoreLatency: () => void
beforeEach(() => {
  restoreLatency = setMockLatencyEnabled(false)
  mockStore.reset()
  mockStore.update((s) => {
    s.sessions = [structuredClone(fixture.session)]
    s.roster = structuredClone(fixture.roster)
    s.courts = structuredClone(fixture.courts)
    s.matches = structuredClone(fixture.matches)
  })
})
afterEach(() => restoreLatency())

describe('make match preview', () => {
  it.each([
    [2, 'singles'],
    [3, 'fun_1v2'],
    [4, 'doubles'],
    [6, 'fun_3v3'],
    [8, 'fun_4v4'],
    [10, 'fun_5v5'],
  ] as [
    number,
    MatchFormat,
  ][])('keeps pick order and reuses balancing for %s players', (count, format) => {
    const selected = fixture.roster.slice(0, count)
    const preview = previewMakeMatch(selected, format)
    expect([...preview.lineup.teamA, ...preview.lineup.teamB]).toEqual(selected.map((p) => p.id))
    expect(arrangeToBalance(selected, format).lineup).toEqual(balanceTeams(selected, format))
    expect(preview.difference).toBe(Math.abs(preview.levelA - preview.levelB))
  })
  it('adds the confirmed lineup to the end of the waiting queue', async () => {
    const selected = fixture.roster.slice(4, 8)
    const lineup = previewMakeMatch(selected, 'doubles').lineup
    const result = await makeMatch({
      sessionId: fixture.session.id,
      selection: selected.map((p) => p.id),
      lineup,
    })
    expect(result.data).toMatchObject({ ...lineup, state: 'waiting', manualProtected: true })
    expect(result.data.queuePosition).toBeGreaterThan(
      Math.max(...fixture.matches.filter((m) => m.state === 'waiting').map((m) => m.queuePosition)),
    )
  })
})
describe('clear and search', () => {
  it('removes waiting matches only and returns the count, then does nothing', async () => {
    const before = readMockState().matches
    const expected = before.filter((m) => m.state === 'waiting').length
    const keep = before.filter((m) => m.state !== 'waiting')
    expect((await clearQueue(fixture.session.id)).data).toBe(expected)
    expect(readMockState().matches).toEqual(keep)
    const snapshot = structuredClone(readMockState())
    expect((await clearQueue(fixture.session.id)).data).toBe(0)
    expect(readMockState()).toEqual(snapshot)
  })
  it('matches full name and nickname without modifying the queue', () => {
    const match = fixture.matches.find((m) => m.state === 'waiting')!
    const roster = structuredClone(fixture.roster)
    const player = roster.find((p) => p.id === match.teamA[0])!
    player.nicknameSnapshot = 'Quick Bird'
    const before = structuredClone(match)
    expect(matchesPlayerText(match, roster, ' QUICK bird ')).toBe(true)
    expect(matchesPlayerText(match, roster, player.nameSnapshot.toUpperCase())).toBe(true)
    expect(queueSearchHitCount([match], roster, 'unknown')).toBe(0)
    expect(match).toEqual(before)
  })
})
