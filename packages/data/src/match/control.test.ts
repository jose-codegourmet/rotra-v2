import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import {
  completeMatch,
  moveCourt,
  placeOnCourt,
  replacePlayer,
  sendBackToQueue,
  startMatch,
  swapWithQueue,
} from './control'
import { freeCourts, matchStatus, waitingMatches } from './match.rules'
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

const court1 = fixture.courts[0]!.id,
  player = (i: number) => fixture.roster[i]!.id
const place3 = () =>
  placeOnCourt({ matchId: ready!.id, courtIds: [court2], operationId: 'place-3' })
const queueIds = () => waitingMatches(readMockState().matches).map((m) => m.id)
const isFree = (courtId: string) =>
  freeCourts(readMockState().courts, readMockState().matches).some((c) => c.id === courtId)

describe('Send back to queue', () => {
  it('puts the match at the top of the queue and frees its court', async () => {
    await place3()
    const sent = await sendBackToQueue({ matchId: ready!.id, operationId: 'back-3' })
    expect(sent.message).toContain('Match 3 back to #1 in the queue · Court 2 free')
    expect(matchIn(ready!.id)).toMatchObject({ state: 'waiting', courtIds: [], placedAt: null })
    expect(queueIds()[0]).toBe(ready!.id)
    expect(isFree(court2)).toBe(true)
  })

  it('keeps an unedited match unprotected, and an edited one goes back protected', async () => {
    mockStore.update((s) => {
      const m = s.matches.find((x) => x.id === ready!.id)!
      m.origin = 'auto'
      m.manualProtected = false
    })
    await place3()
    await sendBackToQueue({ matchId: ready!.id, operationId: 'back-3' })
    expect(matchIn(ready!.id)).toMatchObject({ origin: 'auto', manualProtected: false })
    await placeOnCourt({ matchId: ready!.id, courtIds: [court2], operationId: 'place-3b' })
    await replacePlayer({
      matchId: ready!.id,
      outId: player(4),
      inId: player(9),
      operationId: 'replace-3',
    })
    await sendBackToQueue({ matchId: ready!.id, operationId: 'back-3b' })
    expect(matchIn(ready!.id)).toMatchObject({ origin: 'manual', manualProtected: true })
  })

  it('refuses a match that is not On court', async () => {
    await expect(sendBackToQueue({ matchId: ready!.id, operationId: 'back' })).rejects.toThrow(
      'Something changed. Review the match again.',
    )
    await expect(sendBackToQueue({ matchId: playing!.id, operationId: 'back' })).rejects.toThrow(
      'Something changed. Review the match again.',
    )
  })
})

describe('Move to another court', () => {
  it('takes a free open court and frees the old one, still getting ready', async () => {
    await place3()
    const moved = await moveCourt({ matchId: ready!.id, courtIds: [court4], operationId: 'mv' })
    expect(moved.message).toContain('Match 3 moved from Court 2 to Court 4 · getting ready')
    expect(matchIn(ready!.id)).toMatchObject({ state: 'on_court', courtIds: [court4] })
    expect(isFree(court2)).toBe(true)
  })

  it('refuses a court another match holds', async () => {
    await place3()
    await expect(
      moveCourt({ matchId: ready!.id, courtIds: [court1], operationId: 'mv' }),
    ).rejects.toThrow('Something changed. Review the match again.')
    expect(matchIn(ready!.id).courtIds).toEqual([court2])
  })
})

describe('Replace player', () => {
  it('is a plain lineup change: no substitution, and the new player is busy', async () => {
    await place3()
    const done = await replacePlayer({
      matchId: ready!.id,
      outId: player(4),
      inId: player(9),
      operationId: 'replace-3',
    })
    expect(done.message).toContain('lineup changed')
    const m = matchIn(ready!.id)
    expect(m.teamA).toEqual([player(9), player(6)])
    expect(m.substitutions).toEqual([])
    expect(m.state).toBe('on_court')
  })

  it('refuses a busy or absent player', async () => {
    await place3()
    for (const inId of [player(0), player(5)])
      await expect(
        replacePlayer({ matchId: ready!.id, outId: player(4), inId, operationId: `r-${inId}` }),
      ).rejects.toThrow('Something changed. Review the match again.')
    expect(matchIn(ready!.id).teamA).toEqual([player(4), player(6)])
  })
})

describe('Swap with the queue', () => {
  // Match 1 on Court 1 (getting ready), queue Match 3, Match 4.
  const onCourt = () =>
    mockStore.update((s) => {
      const m1 = s.matches.find((x) => x.id === playing!.id)!
      m1.state = 'on_court'
      m1.startedAt = null
      m1.placedAt = Date.now()
      s.matches = s.matches.filter((x) => x.id !== blocked!.id)
    })

  it('puts the next ready match on the court and this match takes its queue place', async () => {
    onCourt()
    expect(queueIds().slice(0, 2)).toEqual([ready!.id, fixture.matches[3]!.id])
    const swapped = await swapWithQueue({
      matchId: playing!.id,
      withMatchId: ready!.id,
      operationId: 'swap-1',
    })
    expect(swapped.message).toContain(
      'Match 3 swapped onto Court 1 · getting ready · Match 1 back to #1 in the queue',
    )
    expect(matchIn(ready!.id)).toMatchObject({ state: 'on_court', courtIds: [court1] })
    expect(matchIn(ready!.id).startedAt).toBeNull()
    expect(matchIn(playing!.id)).toMatchObject({ state: 'waiting', courtIds: [], placedAt: null })
    expect(queueIds().slice(0, 2)).toEqual([playing!.id, fixture.matches[3]!.id])
  })

  it('counts this match’s players as free when choosing the target', async () => {
    mockStore.update((s) => {
      const m1 = s.matches.find((x) => x.id === playing!.id)!
      m1.state = 'on_court'
      m1.startedAt = null
      m1.placedAt = Date.now()
    })
    // Match 2 shares Migs with Match 1, so it is blocked now but next once Match 1 is off court.
    await swapWithQueue({ matchId: playing!.id, withMatchId: blocked!.id, operationId: 'swap-2' })
    expect(matchIn(blocked!.id)).toMatchObject({ state: 'on_court', courtIds: [court1] })
    expect(matchIn(playing!.id).queuePosition).toBe(2)
  })

  it('refuses when the target is no longer the next ready match', async () => {
    onCourt()
    await expect(
      swapWithQueue({
        matchId: playing!.id,
        withMatchId: fixture.matches[3]!.id,
        operationId: 'swap-stale',
      }),
    ).rejects.toThrow('Something changed. Review the match again.')
    expect(matchIn(playing!.id).state).toBe('on_court')
    expect(matchIn(ready!.id).state).toBe('waiting')
  })
})
