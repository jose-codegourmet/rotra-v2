import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockStore } from '../mock/store'
import { getFinalizationStatus, getSessionDoneReview } from './fetchers'
import { finalizeSession, SessionDoneError } from './finalization'

const SESSION = '0b6f3a52-6c1e-4f8a-9d2b-3e4f5a6b7c8d'
const COMMAND = '5d7e9f10-2a3b-4c5d-8e6f-7a8b9c0d1e2f'

const wireSession = {
  session: {
    id: SESSION,
    clubId: 'club-1',
    title: 'Test Friday Night',
    notes: '',
    scheduledStartAt: '2026-11-01T10:00:00.000Z',
    scheduledEndAt: '2026-11-01T13:00:00.000Z',
    venueId: null,
    venueName: 'Test Hall',
    venueAddress: '',
    state: 'active',
    invalidReason: null,
    minimumGames: 3,
    startedAt: '2026-11-01T10:00:00.000Z',
    finalizedAt: null,
    revision: '4',
  },
  courts: [
    { id: 'ct-1', sessionId: SESSION, label: 'Court 1', openUntil: null, removedAt: null },
    { id: 'ct-2', sessionId: SESSION, label: 'Court 2', openUntil: null, removedAt: null },
  ],
  rosterCount: 4,
  presentCount: 4,
  capacity: 8,
  waitlistCount: 0,
  courtsInUse: 1,
  gamesPlayed: 1,
  queuedCount: 1,
}

const wireMatch = (id: string, state: string, courtIds: string[] = []) => ({
  id,
  sessionId: SESSION,
  matchNo: 1,
  state,
  format: 'doubles',
  queuePosition: 1,
  origin: 'manual',
  manualProtected: false,
  teamA: ['r1', 'r2'],
  teamB: ['r3', 'r4'],
  courtIds,
  startedAt: null,
  endedAt: null,
  substitutions: [],
  decision: null,
  revision: '1',
})

const rosterEntry = (id: string, name: string) => ({
  id,
  sessionId: SESSION,
  clubPlayerId: `c-${id}`,
  nameSnapshot: name,
  nicknameSnapshot: null,
  present: true,
  presentChangedAt: '2026-11-01T10:00:00.000Z',
  level: 'intermediate',
  levelLockedAt: null,
  confirmedAt: '2026-11-01T10:00:00.000Z',
})

const wireStatus = (over: Record<string, unknown> = {}) => ({
  sessionId: SESSION,
  commandId: COMMAND,
  state: 'done',
  stage: 'slides',
  accepted: true,
  committedAt: '2026-11-01T13:00:00.000Z',
  completedAt: '2026-11-01T13:00:01.000Z',
  failedStage: null,
  failureCode: null,
  jobs: [
    { kind: 'club_session_summaries', status: 'done', attempts: 0, lastErrorCode: null },
    { kind: 'result_snapshot', status: 'done', attempts: 1, lastErrorCode: null },
  ],
  ...over,
})

describe('Session done › real mode', () => {
  const fetchMock = vi.fn()
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
  const reply = (status: number, body: unknown) =>
    fetchMock.mockResolvedValueOnce(json(status, body))
  const sent = (call = 0) => {
    const [path, init] = fetchMock.mock.calls[call] as [string, RequestInit]
    return {
      path,
      method: init.method,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    }
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

  it('builds the review from the saved session, roster, matches and the server shortfall', async () => {
    const base = `/api/sessions/${SESSION}`
    fetchMock.mockImplementation(async (path: string) => {
      if (path === `${base}/done-review`)
        return json(200, {
          blocking: ['active_matches'],
          activeMatches: 1,
          completeness: { proven: true, openStreams: 0, openConflicts: 0, pendingOperations: 0 },
          belowMinimum: [{ sessionPlayerId: 'r2', name: 'Test Bea', games: 1 }],
        })
      if (path === base) return json(200, wireSession)
      if (path === `${base}/matches`)
        return json(200, {
          matches: [
            wireMatch('m-1', 'completed'),
            wireMatch('m-2', 'active', ['ct-2']),
            wireMatch('m-3', 'waiting'),
          ],
          queueRevision: '5',
          revision: '4',
        })
      if (path === `${base}/roster`)
        return json(200, {
          roster: [rosterEntry('r1', 'Test Ana'), rosterEntry('r2', 'Test Bea')],
          waitlist: [],
          joinRequests: [],
        })
      return json(404, { error: { code: 'not_found', message: 'Not found.' } })
    })
    const review = await getSessionDoneReview(SESSION)
    expect(review).toEqual({
      sessionId: SESSION,
      gamesRecorded: 1,
      participants: 2,
      pendingChanges: 0,
      activeGames: [{ matchId: 'm-2', courtLabels: ['Court 2'] }],
      unplayedWaiting: 1,
      belowMinimum: [{ clubPlayerId: 'c-r2', name: 'Test Bea', completedGames: 1 }],
      minimum: 3,
    })
  })

  it('finalizes with the sheet commandId and never touches the mock store', async () => {
    const before = mockStore.getSnapshot()
    reply(200, { status: wireStatus(), warnings: { belowMinimum: [] } })
    const outcome = await finalizeSession({ sessionId: SESSION, commandId: COMMAND })
    expect(sent()).toMatchObject({
      path: `/api/sessions/${SESSION}/finalization`,
      method: 'POST',
      body: { commandId: COMMAND },
    })
    expect(outcome.data).toEqual({
      sessionId: SESSION,
      commandId: COMMAND,
      state: 'done',
      stage: 'slides',
    })
    expect(outcome.message).toContain('Session finished')
    expect(mockStore.getSnapshot()).toBe(before)
  })

  it('shows committed work with a failed job as committed at that stage (Try again)', async () => {
    reply(200, {
      status: wireStatus({
        state: 'failed',
        stage: 'player_records',
        failedStage: 'slides',
        jobs: [{ kind: 'result_snapshot', status: 'failed', attempts: 1, lastErrorCode: 'x' }],
      }),
    })
    const outcome = await finalizeSession({ sessionId: SESSION, commandId: COMMAND })
    expect(outcome.data).toMatchObject({ state: 'committed', failedStage: 'slides' })
  })

  it('maps the server barriers to the sheet blockers', async () => {
    reply(409, {
      error: { code: 'conflict', message: 'Changed', fields: { active_matches: 'active_matches' } },
    })
    const refused = finalizeSession({ sessionId: SESSION, commandId: COMMAND })
    await expect(refused).rejects.toBeInstanceOf(SessionDoneError)
    await expect(refused).rejects.toMatchObject({ blocker: 'games_in_play', kind: 'conflict' })
    reply(409, {
      error: { code: 'conflict', message: 'Changed', fields: { unsealed_streams: 'x' } },
    })
    await expect(finalizeSession({ sessionId: SESSION, commandId: COMMAND })).rejects.toMatchObject(
      { blocker: 'incomplete_records' },
    )
  })

  it('reads the status (still-running jobs poll as running) and is null before any commit', async () => {
    reply(
      200,
      wireStatus({
        state: 'committed',
        stage: 'player_records',
        jobs: [{ kind: 'result_snapshot', status: 'pending', attempts: 0, lastErrorCode: null }],
      }),
    )
    expect(await getFinalizationStatus(SESSION)).toMatchObject({
      state: 'running',
      stage: 'player_records',
    })
    expect(sent()).toMatchObject({ path: `/api/sessions/${SESSION}/finalization`, method: 'GET' })
    reply(404, { error: { code: 'not_found', message: 'Not found.' } })
    expect(await getFinalizationStatus(SESSION)).toBeNull()
  })

  it('refuses offline without calling the server', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    await expect(finalizeSession({ sessionId: SESSION, commandId: COMMAND })).rejects.toMatchObject(
      { kind: 'offline' },
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
