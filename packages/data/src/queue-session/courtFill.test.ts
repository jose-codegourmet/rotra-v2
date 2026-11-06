import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import {
  completeMatch,
  invalidateMatch,
  moveCourt,
  placeOnCourt,
  sendBackToQueue,
} from '../match/control'
import type { Match } from '../match/match.types'
import { addMatch } from '../match/queue.mutations'
import { connectMockBridge, DEFAULT_DEV_STATE } from '../mock/bridge'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { fillOpenedCourts, setCourtFillMode } from './courtFill'
import { addCourt, openCourtEarly } from './courts'

// Courts 1–4 are open (Court 3's booking has ended). Match 1 is Playing on Court 1 (players 0–3);
// match 2 (0, 4, 6, 7) waits on it; match 3 (4, 6, 7, 8) is ready; match 4 has an absent player.
// m8 and m9 are ready on the remaining free players; m10 (0–3) waits for match 1.
const fixture = createConsoleFixtures(),
  sessionId = fixture.session.id,
  [playing, , ready] = fixture.matches as Match[],
  courtId = (i: number) => fixture.courts[i]!.id,
  pid = (i: number) => fixture.roster[i]!.id
const waitingMatch = (id: string, n: number, a: number[], b: number[], format = 'doubles') =>
  ({
    ...ready,
    id,
    matchNo: n,
    queuePosition: n,
    format,
    teamA: a.map(pid),
    teamB: b.map(pid),
  }) as Match
const m8 = waitingMatch('m8', 8, [9, 10], [11, 12]),
  m9 = waitingMatch('m9', 9, [13, 14], [15, 16]),
  m10 = waitingMatch('m10', 10, [0, 1], [2, 3])

let restoreLatency: () => void
function seed(extra: Match[], change?: (s: ReturnType<typeof readMockState>) => void) {
  mockStore.reset()
  mockStore.update((s) => {
    s.sessions = [structuredClone(fixture.session)]
    s.roster = structuredClone(fixture.roster)
    s.courts = structuredClone(fixture.courts)
    s.matches = structuredClone([...fixture.matches, ...extra])
    change?.(s)
  })
}
beforeEach(() => {
  restoreLatency = setMockLatencyEnabled(false)
  seed([m8, m9, m10])
})
afterEach(() => restoreLatency())

const matchIn = (id: string) => readMockState().matches.find((m) => m.id === id)!
const auto = () =>
  mockStore.update((s) => {
    s.sessions[0]!.courtFillMode = 'auto'
  })
const offline = () => {
  mockStore.update((s) => {
    s.downloads[sessionId] = 'ready'
  })
  return connectMockBridge({
    read: () => ({ ...DEFAULT_DEV_STATE, offline: true }),
    consume: () => {},
  })
}

describe('Manual Queue | Auto Queue switch', () => {
  it('starts on Manual Queue: a freed court is not filled', async () => {
    await completeMatch({ matchId: playing!.id, winningTeam: 'A', operationId: 'done-1' })
    expect(matchIn('m10').state).toBe('waiting')
  })

  it('Auto on fills every free open court now, in court order, never starting', async () => {
    const done = await setCourtFillMode({ sessionId, mode: 'auto' })
    expect(done.message).toContain('Auto Queue on · Match 3 on Court 2 · getting ready')
    expect(readMockState().sessions[0]!.courtFillMode).toBe('auto')
    expect(matchIn(ready!.id)).toMatchObject({ state: 'on_court', courtIds: [courtId(1)] })
    // Court 3's booking has ended: it still fills.
    expect(matchIn('m8')).toMatchObject({ state: 'on_court', courtIds: [courtId(2)] })
    expect(matchIn('m9')).toMatchObject({ state: 'on_court', courtIds: [courtId(3)] })
    for (const id of [ready!.id, 'm8', 'm9']) expect(matchIn(id).startedAt).toBeNull()
  })

  it('turning Auto off leaves On court matches where they are', async () => {
    await setCourtFillMode({ sessionId, mode: 'auto' })
    const done = await setCourtFillMode({ sessionId, mode: 'manual' })
    expect(done.message).toContain('matches already on court stay where they are')
    expect(matchIn(ready!.id)).toMatchObject({ state: 'on_court', courtIds: [courtId(1)] })
    await completeMatch({ matchId: playing!.id, winningTeam: 'A', operationId: 'done-1' })
    expect(matchIn('m10').state).toBe('waiting')
  })

  it('needs internet: refused offline', async () => {
    const disconnect = offline()
    try {
      await expect(setCourtFillMode({ sessionId, mode: 'auto' })).rejects.toThrow("You're offline")
      expect(readMockState().sessions[0]!.courtFillMode).toBeUndefined()
    } finally {
      disconnect()
    }
  })
})

describe('Auto Queue triggers', () => {
  it('Match done frees a court and fills it', async () => {
    await setCourtFillMode({ sessionId, mode: 'auto' })
    const done = await completeMatch({ matchId: playing!.id, winningTeam: 'A', operationId: 'd' })
    expect(done.message).toContain('Court 1 free · Match 10 on Court 1 · getting ready')
    expect(matchIn('m10')).toMatchObject({ state: 'on_court', courtIds: [courtId(0)] })
  })

  it('an invalid match frees a court and fills it', async () => {
    await setCourtFillMode({ sessionId, mode: 'auto' })
    await invalidateMatch({ matchId: playing!.id, operationId: 'inv-1' })
    expect(matchIn('m10')).toMatchObject({ state: 'on_court', courtIds: [courtId(0)] })
  })

  it('Move to another court fills the court it left', async () => {
    seed([m8])
    await placeOnCourt({ matchId: ready!.id, courtIds: [courtId(1)], operationId: 'place-3' })
    auto()
    await moveCourt({ matchId: ready!.id, courtIds: [courtId(3)], operationId: 'move-3' })
    expect(matchIn(ready!.id).courtIds).toEqual([courtId(3)])
    expect(matchIn('m8')).toMatchObject({ state: 'on_court', courtIds: [courtId(1)] })
  })

  it('Send back refills the court with a match other than the one sent back', async () => {
    const again = waitingMatch('again', 11, [4, 6], [7, 8])
    seed([m8, m9, again])
    await setCourtFillMode({ sessionId, mode: 'auto' })
    const done = await sendBackToQueue({ matchId: ready!.id, operationId: 'back-3' })
    expect(done.message).toContain('Court 2 free · Match 11 on Court 2 · getting ready')
    expect(matchIn(ready!.id)).toMatchObject({ state: 'waiting', queuePosition: 1 })
    expect(matchIn('again')).toMatchObject({ state: 'on_court', courtIds: [courtId(1)] })
  })

  it('a match added while a court is free goes on it', async () => {
    seed([])
    await setCourtFillMode({ sessionId, mode: 'auto' })
    const done = await addMatch({
      sessionId,
      format: 'doubles',
      teamA: [pid(9), pid(10)],
      teamB: [pid(11), pid(12)],
    })
    expect(done.message).toMatch(/Match added to the queue · Match \d+ on Court 3/)
    expect(done.data).toMatchObject({ state: 'on_court', courtIds: [courtId(2)] })
  })

  it('a court opened early fills; a court not open yet is skipped', async () => {
    seed([m8, m9], (s) => {
      s.courts[3]!.startsAt = Date.now() + 3600000
    })
    await setCourtFillMode({ sessionId, mode: 'auto' })
    expect(matchIn('m9').state).toBe('waiting')
    await openCourtEarly({ sessionId, courtId: courtId(3) })
    expect(matchIn('m9')).toMatchObject({ state: 'on_court', courtIds: [courtId(3)] })
  })

  it('a court reaching its planned opening fills; nothing to place writes nothing', async () => {
    seed([m8, m9], (s) => {
      s.courts[3]!.startsAt = Date.now() + 3600000
    })
    await setCourtFillMode({ sessionId, mode: 'auto' })
    const before = mockStore.getSnapshot()
    expect(await fillOpenedCourts({ sessionId, courtIds: [courtId(3)] })).toMatchObject({
      data: 0,
    })
    expect(mockStore.getSnapshot()).toBe(before)
    mockStore.update((s) => {
      s.courts[3]!.startsAt = Date.now() - 1000
    })
    expect((await fillOpenedCourts({ sessionId, courtIds: [courtId(3)] })).data).toBe(1)
    expect(matchIn('m9')).toMatchObject({ state: 'on_court', courtIds: [courtId(3)] })
  })

  it('a court added to the running session fills', async () => {
    seed([m8], (s) => {
      for (const c of s.courts.slice(2)) c.removedAt = Date.now()
    })
    await setCourtFillMode({ sessionId, mode: 'auto' })
    expect(matchIn('m8').state).toBe('waiting')
    const added = await addCourt({ sessionId, label: 'Court 5', openUntil: null })
    expect(matchIn('m8')).toMatchObject({ state: 'on_court', courtIds: [added.data.id] })
  })

  it('skips 5v5 matches', async () => {
    const big = waitingMatch('big', 0, [4, 6, 7, 8, 9], [10, 11, 12, 13, 14], 'fun_5v5')
    seed([big])
    await setCourtFillMode({ sessionId, mode: 'auto' })
    expect(matchIn('big').state).toBe('waiting')
    expect(matchIn(ready!.id).state).toBe('on_court')
  })

  it('pauses while offline: no automatic placement', async () => {
    await setCourtFillMode({ sessionId, mode: 'auto' })
    const disconnect = offline()
    try {
      const done = await completeMatch({ matchId: playing!.id, winningTeam: 'A', operationId: 'd' })
      expect(done.savedOffline).toBe(true)
      expect(matchIn('m10').state).toBe('waiting')
      expect((await fillOpenedCourts({ sessionId, courtIds: [courtId(0)] })).data).toBe(0)
    } finally {
      disconnect()
    }
  })
})
