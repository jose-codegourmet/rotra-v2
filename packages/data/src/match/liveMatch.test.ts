import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { moveCourt, pauseMatch, placeOnCourt, startMatch, swapFromMatch } from './control'
import { canMovePlaying, swapFromMatchOpponents } from './liveMatch.rules'
import { freeCourts } from './match.rules'
import type { Match } from './match.types'
import { matchContext, swapPlayers } from './queue.mutations'

// Match 1 is Playing on Court 1 (players 0, 1 v 2, 3); match 3 (players 4, 6 v 7, 8) is ready.
// Court 2 and Court 4 are free and open.
const fixture = createConsoleFixtures(),
  sessionId = fixture.session.id,
  [playing, , ready] = fixture.matches,
  [court1, court2, , court4] = fixture.courts.map((c) => c.id),
  player = (i: number) => fixture.roster[i]!.id
let restoreLatency: () => void
const load = (matches: Match[]) =>
  mockStore.update((s) => {
    s.sessions = [structuredClone(fixture.session)]
    s.roster = structuredClone(fixture.roster)
    s.courts = structuredClone(fixture.courts)
    s.matches = structuredClone(matches)
  })
beforeEach(() => {
  restoreLatency = setMockLatencyEnabled(false)
  mockStore.reset()
  load(fixture.matches)
})
afterEach(() => restoreLatency())
const matchIn = (id: string) => readMockState().matches.find((m) => m.id === id)!
const isFree = (courtId: string) =>
  freeCourts(readMockState().courts, readMockState().matches).some((c) => c.id === courtId)

describe('Pause match', () => {
  it('takes a Playing match back to Getting ready on the same court and clears the start time', async () => {
    const paused = await pauseMatch({ matchId: playing!.id, operationId: 'pause-1' })
    expect(paused.message).toContain('Match 1 paused · back to Getting ready on Court 1')
    const m = matchIn(playing!.id)
    expect(m).toMatchObject({ state: 'on_court', courtIds: [court1], startedAt: null })
    expect(m.placedAt).toEqual(expect.any(Number))
    expect(m.teamA).toEqual(playing!.teamA)
    expect(m.teamB).toEqual(playing!.teamB)
    expect(m.decision).toBeNull()
    expect(isFree(court1!)).toBe(false)
  })

  it('keeps substitutions, and Start match gives a fresh start time', async () => {
    const sub = { outId: player(9), inId: player(0), team: 'A' as const, at: Date.now() - 60000 }
    mockStore.update((s) => {
      s.matches.find((m) => m.id === playing!.id)!.substitutions = [sub]
    })
    await pauseMatch({ matchId: playing!.id, operationId: 'pause-1' })
    expect(matchIn(playing!.id).substitutions).toEqual([sub])
    const before = Date.now()
    const started = await startMatch({ matchId: playing!.id, operationId: 'start-again' })
    expect(started.message).toContain('Match 1 started on Court 1')
    expect(matchIn(playing!.id).state).toBe('active')
    expect(matchIn(playing!.id).startedAt).toBeGreaterThanOrEqual(before)
  })

  it('pauses and restarts a merged two-court match on both courts', async () => {
    const merged = createConsoleFixtures().merged.matches
    load(merged)
    const id = merged[0]!.id
    const paused = await pauseMatch({ matchId: id, operationId: 'pause-merged' })
    expect(paused.message).toContain('paused · back to Getting ready on ')
    expect(matchIn(id)).toMatchObject({
      state: 'on_court',
      courtIds: [court1, court2],
      startedAt: null,
    })
    await startMatch({ matchId: id, operationId: 'start-merged' })
    expect(matchIn(id)).toMatchObject({ state: 'active', courtIds: [court1, court2] })
    expect(matchIn(id).startedAt).toEqual(expect.any(Number))
  })

  it('refuses a match that is not Playing', async () => {
    await expect(pauseMatch({ matchId: ready!.id, operationId: 'pause-3' })).rejects.toThrow(
      'Something changed. Review the match again.',
    )
  })
})

describe('Move a Playing match', () => {
  it('keeps playing with the same start time and frees the old court', async () => {
    const startedAt = matchIn(playing!.id).startedAt
    const moved = await moveCourt({ matchId: playing!.id, courtIds: [court4!], operationId: 'mv' })
    expect(moved.message).toContain('Match 1 moved from Court 1 to Court 4 · still playing')
    expect(matchIn(playing!.id)).toMatchObject({ state: 'active', courtIds: [court4], startedAt })
    expect(isFree(court1!)).toBe(true)
  })

  it('fills the court it left in Auto Queue, in the same write', async () => {
    mockStore.update((s) => {
      s.sessions[0]!.courtFillMode = 'auto'
      // Only match 3 waits and only Court 1 and Court 4 are left, so the freed Court 1 fills.
      s.matches = s.matches.filter((m) => m.id === playing!.id || m.id === ready!.id)
      for (const c of s.courts) if (c.id !== court1 && c.id !== court4) c.removedAt = Date.now()
    })
    const moved = await moveCourt({ matchId: playing!.id, courtIds: [court4!], operationId: 'mv' })
    expect(moved.message).toContain('· still playing · Match 3 on Court 1 · getting ready')
    expect(matchIn(ready!.id)).toMatchObject({ state: 'on_court', courtIds: [court1] })
  })

  it('refuses a court another match holds, and a two-court match without two free courts', async () => {
    await placeOnCourt({ matchId: ready!.id, courtIds: [court2!], operationId: 'place-3' })
    await expect(
      moveCourt({ matchId: playing!.id, courtIds: [court2!], operationId: 'mv-held' }),
    ).rejects.toThrow('Something changed. Review the match again.')
    expect(matchIn(playing!.id).courtIds).toEqual([court1])
    const merged = createConsoleFixtures().merged.matches
    load(merged)
    const ctx = matchContext(readMockState(), sessionId)
    expect(canMovePlaying(matchIn(merged[0]!.id), [court4!], ctx)).toBe(false)
  })
})

describe('Swap partners while Playing', () => {
  it('trades two players on different teams and records no substitution', async () => {
    const swapped = await swapPlayers({
      sessionId,
      matchId: playing!.id,
      a: player(1),
      b: player(2),
    })
    expect(swapped.message).toMatch(/^Match 1: .+ and .+ swapped partners/)
    const m = matchIn(playing!.id)
    expect(m.teamA).toEqual([player(0), player(2)])
    expect(m.teamB).toEqual([player(1), player(3)])
    expect(m.substitutions).toEqual([])
    expect(m.state).toBe('active')
    expect(m.startedAt).toBe(playing!.startedAt)
  })

  it('still says switched sides and protects a Getting ready match', async () => {
    mockStore.update((s) => {
      s.matches.find((m) => m.id === ready!.id)!.manualProtected = false
    })
    await placeOnCourt({ matchId: ready!.id, courtIds: [court2!], operationId: 'place-3' })
    const swapped = await swapPlayers({
      sessionId,
      matchId: ready!.id,
      a: player(4),
      b: player(7),
    })
    expect(swapped.message).toContain('switched sides · protected from regeneration')
    expect(matchIn(ready!.id)).toMatchObject({ state: 'on_court', manualProtected: true })
  })

  it('refuses two players on the same team', async () => {
    await expect(
      swapPlayers({ sessionId, matchId: playing!.id, a: player(0), b: player(1) }),
    ).rejects.toThrow('Choose one player from each team.')
  })
})

describe('Swap from match', () => {
  it('lists the opponents of the player coming out', () => {
    expect(swapFromMatchOpponents(playing!, player(0))).toEqual([player(2), player(3)])
    expect(swapFromMatchOpponents(playing!, player(9))).toEqual([])
  })

  it('trades the player coming out with an opponent; nobody new, protected', async () => {
    mockStore.update((s) => {
      s.matches.find((m) => m.id === playing!.id)!.manualProtected = false
    })
    const swapped = await swapFromMatch({
      matchId: playing!.id,
      outId: player(3),
      inId: player(0),
      operationId: 'swap-in-1',
    })
    expect(swapped.message).toMatch(/^Match 1: .+ and .+ swapped places/)
    const m = matchIn(playing!.id)
    expect(m.teamA).toEqual([player(3), player(1)])
    expect(m.teamB).toEqual([player(2), player(0)])
    expect(m.substitutions).toEqual([])
    expect(m).toMatchObject({ state: 'active', manualProtected: true, origin: 'manual' })
  })

  it('refuses a partner, an outsider and a waiting match', async () => {
    for (const [outId, inId] of [
      [player(0), player(1)],
      [player(0), player(9)],
    ] as const)
      await expect(
        swapFromMatch({ matchId: playing!.id, outId, inId, operationId: `s-${inId}` }),
      ).rejects.toThrow('Something changed. Review the match again.')
    await expect(
      swapFromMatch({
        matchId: ready!.id,
        outId: player(4),
        inId: player(7),
        operationId: 's-wait',
      }),
    ).rejects.toThrow('Something changed. Review the match again.')
  })
})
