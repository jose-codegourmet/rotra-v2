import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { completeMatch, placeOnCourt, startMatch } from './control'
import { matchStatus } from './match.rules'
import { matchContext, regenerateQueue } from './queue.mutations'

// Match 1 is Playing on Court 1 (players 0–3); match 2 (players 0, 4, 6, 7) waits on it;
// match 3 (players 4, 6, 7, 8) is ready.
const fixture = createConsoleFixtures(),
  sessionId = fixture.session.id,
  [playing, blocked, ready] = fixture.matches,
  court2 = fixture.courts[1]!.id,
  court4 = fixture.courts[3]!.id
let restoreLatency: () => void
beforeEach(() => {
  restoreLatency = setMockLatencyEnabled(false)
  mockStore.reset()
  mockStore.update((s) => {
    s.sessions = [fixture.session]
    s.roster = structuredClone(fixture.roster)
    s.courts = structuredClone(fixture.courts)
    s.matches = structuredClone(fixture.matches)
  })
})
afterEach(() => restoreLatency())
const matchIn = (id: string) => readMockState().matches.find((m) => m.id === id)!

describe('Put on court', () => {
  it('takes the court and makes the players busy without starting the timer', async () => {
    const placed = await placeOnCourt({
      matchId: ready!.id,
      courtIds: [court2],
      operationId: 'place-3',
    })
    expect(placed.message).toContain('Match 3 on Court 2 · getting ready')
    expect(matchIn(ready!.id)).toMatchObject({ state: 'on_court', courtIds: [court2] })
    expect(matchIn(ready!.id).placedAt).toEqual(expect.any(Number))
    expect(matchIn(ready!.id).startedAt).toBeNull()
  })

  it('refuses a second placement of a busy player', async () => {
    await placeOnCourt({ matchId: ready!.id, courtIds: [court2], operationId: 'place-3' })
    await completeMatch({ matchId: playing!.id, winningTeam: 'A', operationId: 'done-1' })
    const ctx = matchContext(readMockState(), sessionId)
    expect(matchStatus(matchIn(blocked!.id), ctx).reason).toMatch(/ on Court 2$/)
    await expect(
      placeOnCourt({ matchId: blocked!.id, courtIds: [court4], operationId: 'place-2' }),
    ).rejects.toThrow('Something changed. Review the match again.')
    expect(matchIn(blocked!.id).state).toBe('waiting')
  })

  it('refuses a court another match holds', async () => {
    await expect(
      placeOnCourt({ matchId: ready!.id, courtIds: [fixture.courts[0]!.id], operationId: 'p' }),
    ).rejects.toThrow('Something changed. Review the match again.')
  })

  it('leaves On court matches alone when the queue is regenerated', async () => {
    await placeOnCourt({ matchId: ready!.id, courtIds: [court2], operationId: 'place-3' })
    const before = structuredClone(matchIn(ready!.id))
    expect((await regenerateQueue(sessionId)).message).toContain('rebuilt')
    expect(matchIn(ready!.id)).toEqual(before)
  })
})

describe('Start match from On court', () => {
  it('starts on the held court with one tap and starts the timer', async () => {
    await placeOnCourt({ matchId: ready!.id, courtIds: [court2], operationId: 'place-3' })
    const placedAt = matchIn(ready!.id).placedAt
    const started = await startMatch({ matchId: ready!.id, operationId: 'start-3' })
    expect(started.message).toContain('Match 3 started on Court 2')
    expect(matchIn(ready!.id)).toMatchObject({ state: 'active', courtIds: [court2], placedAt })
    expect(matchIn(ready!.id).startedAt).toEqual(expect.any(Number))
  })

  it('rechecks presence first', async () => {
    await placeOnCourt({ matchId: ready!.id, courtIds: [court2], operationId: 'place-3' })
    mockStore.update((s) => {
      const p = s.roster.find((r) => r.id === ready!.teamA[0])!
      p.present = false
    })
    await expect(startMatch({ matchId: ready!.id, operationId: 'start-3' })).rejects.toThrow(
      'Something changed. Review the match again.',
    )
    expect(matchIn(ready!.id)).toMatchObject({ state: 'on_court', startedAt: null })
  })

  it('keeps the one-step start for a waiting match', async () => {
    await startMatch({ matchId: ready!.id, courtIds: [court2], operationId: 'start-direct' })
    expect(matchIn(ready!.id)).toMatchObject({ state: 'active', courtIds: [court2] })
    expect(matchIn(ready!.id).startedAt).toEqual(matchIn(ready!.id).placedAt)
  })
})
