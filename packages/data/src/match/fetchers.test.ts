import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockStore } from '../mock/store'
import { finalizeSession, invalidateSession } from '../queue-session/finalization'
import {
  getSessionPublication,
  getSessionResults,
  publishResults,
} from '../session-result/fetchers'
import { generateAutoQueueDrafts, getAutoQueueDrafts } from './autoQueue.mutations'
import { completeMatch, startMatch } from './control'
import { getSessionMatches } from './fetchers'
import { addMatch, moveMatch, removeWaitingMatch, swapPlayers } from './queue.mutations'

const wireMatch = (over: Record<string, unknown> = {}) => ({
  id: 'm-1',
  sessionId: 's-1',
  matchNo: 3,
  state: 'waiting',
  format: 'doubles',
  queuePosition: 1,
  origin: 'manual',
  manualProtected: true,
  teamA: ['p1', 'p2'],
  teamB: ['p3', 'p4'],
  courtIds: [],
  startedAt: null,
  endedAt: null,
  substitutions: [],
  decision: null,
  revision: '2',
  ...over,
})

const rosterEntry = (id: string, name: string) => ({
  id,
  sessionId: 's',
  clubPlayerId: `c-${id}`,
  nameSnapshot: name,
  nicknameSnapshot: null,
  present: true,
  presentChangedAt: '2026-11-01T10:00:00.000Z',
  level: 'intermediate',
  levelLockedAt: null,
  confirmedAt: '2026-11-01T10:00:00.000Z',
  revision: '1',
})

const wireSession = (id: string) => ({
  session: {
    id,
    clubId: 'club-1',
    title: 'Friday Night',
    notes: '',
    scheduledStartAt: '2026-11-01T10:00:00.000Z',
    scheduledEndAt: '2026-11-01T13:00:00.000Z',
    venueId: null,
    venueName: 'Hall',
    venueAddress: '',
    state: 'active',
    invalidReason: null,
    startedAt: '2026-11-01T10:00:00.000Z',
    finalizedAt: null,
    revision: '4',
  },
  courts: [{ id: 'ct-1', sessionId: id, label: 'Court 1', openUntil: null, removedAt: null }],
  rosterCount: 4,
  presentCount: 4,
  capacity: 8,
  waitlistCount: 0,
  courtsInUse: 0,
  gamesPlayed: 0,
  queuedCount: 1,
})

describe('Matches and results › real mode', () => {
  const fetchMock = vi.fn()
  const reply = (status: number, body: unknown) =>
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
  const sent = (call = 0) => {
    const [path, init] = fetchMock.mock.calls[call] as [string, RequestInit]
    return {
      path,
      method: init.method,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    }
  }
  /** Shows one session's queue, as the console does before any command. */
  const show = async (sessionId: string, matches: unknown[], queueRevision = '7') => {
    reply(200, { matches, queueRevision, revision: '4' })
    return getSessionMatches(sessionId)
  }

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ROTRA_DATA_MODE', 'real')
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reads saved matches in queue order with times in ms and no wire revision', async () => {
    const matches = await show('s-read', [
      wireMatch({ id: 'b', sessionId: 's-read', queuePosition: 2 }),
      wireMatch({
        id: 'a',
        sessionId: 's-read',
        queuePosition: 1,
        state: 'active',
        startedAt: '2026-11-01T10:05:00.000Z',
      }),
    ])
    expect(sent()).toMatchObject({ path: '/api/sessions/s-read/matches', method: 'GET' })
    expect(matches.map((m) => m.id)).toEqual(['a', 'b'])
    expect(matches[0]?.startedAt).toBe(Date.parse('2026-11-01T10:05:00.000Z'))
    expect(matches[0]).not.toHaveProperty('revision')
  })

  it('reorders with the shown queue revision and surfaces a stale one as a conflict', async () => {
    await show('s-move', [
      wireMatch({ id: 'x', sessionId: 's-move', matchNo: 4, queuePosition: 1 }),
      wireMatch({ id: 'y', sessionId: 's-move', matchNo: 5, queuePosition: 2 }),
      wireMatch({ id: 'z', sessionId: 's-move', matchNo: 6, queuePosition: 3 }),
    ])
    reply(200, { result: { matchId: 'z', position: 1 }, queueRevision: '8' })
    const moved = await moveMatch({ sessionId: 's-move', matchId: 'z', toIndex: 0, method: 'drop' })
    expect(sent(1)).toMatchObject({
      path: '/api/sessions/s-move/matches/z/position',
      method: 'POST',
      body: { toIndex: 0, expectedQueueRevision: '7' },
    })
    expect(moved.message).toContain('Match 6 moved to #1')
    reply(409, { error: { code: 'conflict', message: 'This changed since you loaded it.' } })
    await expect(
      moveMatch({ sessionId: 's-move', matchId: 'x', toIndex: 2 }),
    ).rejects.toMatchObject({ kind: 'conflict' })
    // Only this screen's own change happened (7 → 8), so the next command sends 8.
    expect(sent(2).body).toMatchObject({ expectedQueueRevision: '8' })
  })

  it('keeps the shown revision when the reply shows another change happened too', async () => {
    await show('s-add', [wireMatch({ id: 'w', sessionId: 's-add' })])
    reply(201, { result: wireMatch({ id: 'new', sessionId: 's-add' }), queueRevision: '10' })
    const added = await addMatch({
      sessionId: 's-add',
      format: 'doubles',
      teamA: ['p1', 'p2'],
      teamB: ['p3', 'p4'],
    })
    expect(sent(1)).toMatchObject({ path: '/api/sessions/s-add/matches', method: 'POST' })
    expect(sent(1).body).toMatchObject({ source: 'manual', lineup: { format: 'doubles' } })
    expect(sent(1).body.operationId).toMatch(/^[0-9a-f-]{36}$/)
    expect(added.message).toContain('Match added to the queue')
    reply(200, { result: null, queueRevision: '11' })
    const removed = await removeWaitingMatch({ sessionId: 's-add', matchId: 'w' })
    expect(sent(2)).toMatchObject({
      path: '/api/sessions/s-add/matches/w',
      method: 'DELETE',
      body: { expectedQueueRevision: '7' },
    })
    expect(removed.message).toContain('Waiting match 3 removed')
  })

  it('switches sides as a lineup edit of the shown match', async () => {
    await show('s-swap', [wireMatch({ id: 'sw', sessionId: 's-swap' })])
    reply(200, {
      roster: [rosterEntry('p1', 'Mikee Cruz'), rosterEntry('p3', 'Dexter Lim')],
      waitlist: [],
      joinRequests: [],
    })
    reply(200, { result: wireMatch({ id: 'sw', sessionId: 's-swap' }), queueRevision: '8' })
    const swapped = await swapPlayers({ sessionId: 's-swap', matchId: 'sw', a: 'p1', b: 'p3' })
    expect(sent(2)).toMatchObject({
      path: '/api/sessions/s-swap/matches/sw',
      method: 'PATCH',
      body: {
        lineup: { format: 'doubles', teamA: ['p3', 'p2'], teamB: ['p1', 'p4'] },
        expectedQueueRevision: '7',
      },
    })
    expect(swapped.message).toContain('Mikee and Dexter switched sides')
  })

  it('starts a shown match with the screen operation ID and names the court', async () => {
    await show('s-start', [wireMatch({ id: 'st', sessionId: 's-start', matchNo: 9 })])
    reply(200, wireSession('s-start'))
    reply(200, {
      result: wireMatch({
        id: 'st',
        sessionId: 's-start',
        matchNo: 9,
        state: 'active',
        courtIds: ['ct-1'],
      }),
      queueRevision: '8',
    })
    const operationId = crypto.randomUUID()
    const started = await startMatch({ matchId: 'st', courtIds: ['ct-1'], operationId })
    expect(sent(2)).toMatchObject({
      path: '/api/sessions/s-start/matches/st/start',
      method: 'POST',
      body: { operationId, courtIds: ['ct-1'] },
    })
    expect(started.message).toContain('Match 9 started on Court 1')
  })

  it('maps a refused result to the field message and refuses a match it never showed', async () => {
    await show('s-done', [wireMatch({ id: 'cm', sessionId: 's-done', state: 'active' })])
    reply(200, wireSession('s-done'))
    reply(422, {
      error: { code: 'invalid', message: 'Check', fields: { result: 'Choose the winning team.' } },
    })
    await expect(
      completeMatch({ matchId: 'cm', operationId: crypto.randomUUID() }),
    ).rejects.toMatchObject({ kind: 'permission', message: 'Choose the winning team.' })
    fetchMock.mockReset()
    await expect(
      completeMatch({ matchId: 'unknown', winningTeam: 'A', operationId: crypto.randomUUID() }),
    ).rejects.toMatchObject({ message: 'Match not available.' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reads the private snapshot and only a published publication', async () => {
    const results = {
      finalization: { state: 'done', stage: 'slides' },
      snapshot: {
        id: 'snap',
        version: 1,
        calculationVersion: 'prototype-reference',
        standings: [
          {
            position: 1,
            sessionPlayerId: 'p1',
            clubPlayerId: 'c1',
            name: 'Mikee',
            wins: 2,
            losses: 0,
            games: 2,
          },
        ],
        awards: { mvp: null, mostImproved: null },
        offDay: null,
        generatedAt: '2026-11-01T14:00:00.000Z',
      },
      publication: {
        state: 'details',
        publishedSlides: [],
        includeOffDay: false,
        publishedAt: null,
      },
      exports: [],
    }
    reply(200, results)
    const snapshot = await getSessionResults('s-res')
    expect(sent()).toMatchObject({ path: '/api/sessions/s-res/results', method: 'GET' })
    expect(snapshot).toMatchObject({
      sessionId: 's-res',
      awards: { mvp: null, offDay: [] },
      generatedAt: Date.parse('2026-11-01T14:00:00.000Z'),
    })
    reply(200, results)
    expect(await getSessionPublication('s-res')).toBeNull()
    reply(200, null)
    expect(await getSessionResults('s-invalid')).toBeNull()
  })

  it('publishes with a fresh command ID and an explicit Off Day choice', async () => {
    reply(200, wireSession('s-pub'))
    reply(200, {
      slides: ['standings', 'awards'],
      includeOffDay: false,
      publishedAt: '2026-11-01T15:00:00.000Z',
    })
    const outcome = await publishResults({
      sessionId: 's-pub',
      publishedSlides: ['standings', 'awards'],
      includeOffDay: false,
    })
    expect(sent(1)).toMatchObject({
      path: '/api/sessions/s-pub/results/publication',
      method: 'POST',
      body: { slides: ['awards', 'standings'], includeOffDay: false },
    })
    expect(sent(1).body.commandId).toMatch(/^[0-9a-f-]{36}$/)
    expect(outcome.data).toMatchObject({ sessionId: 's-pub', includeOffDay: false })
    expect(outcome.message).toContain('Friday Night: Awards, Standings published')
  })

  it('marks a session invalid through its route', async () => {
    reply(200, wireSession('s-inv'))
    reply(200, { state: 'invalid', invalidReason: 'Power cut' })
    const outcome = await invalidateSession({ sessionId: 's-inv', reason: ' Power cut ' })
    expect(sent(1)).toMatchObject({
      path: '/api/sessions/s-inv/invalid',
      method: 'POST',
      body: { reason: 'Power cut' },
    })
    expect(outcome.data).toMatchObject({ state: 'invalid', invalidReason: 'Power cut' })
  })

  it('keeps Auto queue drafts and Session done not connected, never the mock store', async () => {
    const before = mockStore.getSnapshot()
    await expect(getAutoQueueDrafts('s')).rejects.toMatchObject({
      message: "This part of ROTRA isn't connected to saved data yet.",
    })
    await expect(
      generateAutoQueueDrafts({ sessionId: 's', mode: 'available', count: 2 }),
    ).rejects.toMatchObject({ message: "This part of ROTRA isn't connected to saved data yet." })
    await expect(
      finalizeSession({ sessionId: 's', commandId: crypto.randomUUID() }),
    ).rejects.toMatchObject({ message: "This part of ROTRA isn't connected to saved data yet." })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockStore.getSnapshot()).toBe(before)
  })

  it('refuses offline without calling the server', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    await expect(getSessionMatches('s-off')).rejects.toMatchObject({ kind: 'offline' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
