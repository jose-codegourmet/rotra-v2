import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockStore } from '../mock/store'
import {
  editAutoQueueDrafts,
  generateAutoQueueDrafts,
  getAutoQueueDrafts,
  transferAutoQueueDrafts,
} from './autoQueue.mutations'

const PLAYERS = ['p1', 'p2', 'p3', 'p4']

const wireSession = (id: string, state = 'active') => ({
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
    state,
    invalidReason: null,
    sessionMode: 'casual',
    allowSingles: true,
    allowDoubles: true,
    minimumGames: 3,
    minimumIsCalculated: true,
    playersPerCourt: 4,
    expectedPlayers: null,
    startedAt: '2026-11-01T10:00:00.000Z',
    finalizedAt: null,
    playerRecordsUpdatedAt: null,
    seriesId: null,
    publicSlug: 'friday',
    acceptJoinRequests: false,
    revision: '4',
  },
  courts: [{ id: 'ct-1', sessionId: id, label: 'Court 1', openUntil: null, removedAt: null }],
  rosterCount: 4,
  presentCount: 4,
  capacity: 8,
  waitlistCount: 0,
  courtsInUse: 0,
  gamesPlayed: 0,
  queuedCount: 0,
})

const rosterEntry = (sessionId: string, id: string, present = true) => ({
  id,
  sessionId,
  clubPlayerId: `c-${id}`,
  nameSnapshot: `Player ${id}`,
  nicknameSnapshot: null,
  present,
  presentChangedAt: '2026-11-01T10:00:00.000Z',
  level: 'intermediate',
  levelLockedAt: null,
  confirmedAt: '2026-11-01T10:00:00.000Z',
})

const savedMatch = (sessionId: string, i: number, lineup: Record<string, unknown>) => ({
  id: `m-${i}`,
  sessionId,
  matchNo: i + 1,
  state: 'waiting',
  queuePosition: i + 1,
  origin: 'auto',
  manualProtected: false,
  courtIds: [],
  startedAt: null,
  endedAt: null,
  substitutions: [],
  decision: null,
  revision: '1',
  ...lineup,
})

describe('Auto queue drafts › real mode', () => {
  const fetchMock = vi.fn()
  /** The server as the screen sees it; `absent` players are not present on the next read. */
  let server: {
    state: string
    absent: string[]
    queueRevision: string
    post: (body: Record<string, unknown>) => Response | Promise<Response>
  }
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
  const posts = () =>
    fetchMock.mock.calls
      .filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')
      .map(([path, init]) => ({
        path: path as string,
        body: JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>,
      }))

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ROTRA_DATA_MODE', 'real')
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    server = {
      state: 'active',
      absent: [],
      queueRevision: '7',
      post: (body) => {
        const drafts = body.drafts as { lineup: Record<string, unknown> }[]
        return json(201, {
          result: drafts.map((d, i) => savedMatch('s', i, d.lineup)),
          queueRevision: String(BigInt(server.queueRevision) + 1n),
        })
      },
    }
    fetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const [, , , sessionId, tail] = path.split('/')
      if (init?.method === 'POST')
        return server.post(JSON.parse(String(init.body)) as Record<string, unknown>)
      if (tail === 'matches')
        return json(200, { matches: [], queueRevision: server.queueRevision, revision: '4' })
      if (tail === 'roster')
        return json(200, {
          roster: PLAYERS.map((id) =>
            rosterEntry(sessionId as string, id, !server.absent.includes(id)),
          ),
          waitlist: [],
          joinRequests: [],
        })
      return json(200, wireSession(sessionId as string, server.state))
    })
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('keeps the working set on the device, built from saved data, not the mock', async () => {
    const before = mockStore.getSnapshot()
    const empty = await getAutoQueueDrafts('s-gen')
    expect(empty).toMatchObject({ batches: {}, selectedIds: [], committedIds: [] })
    const state = await generateAutoQueueDrafts({ sessionId: 's-gen', mode: 'available', count: 2 })
    const drafts = state.batches.available?.drafts ?? []
    expect(drafts).toHaveLength(2)
    expect(drafts.every((d) => d.format === 'doubles' && d.mode === 'available')).toBe(true)
    expect(drafts.every((d) => d.fingerprint === empty.fingerprint)).toBe(true)
    expect((await getAutoQueueDrafts('s-gen')).batches.available?.drafts).toEqual(drafts)
    expect(posts()).toEqual([])
    expect(mockStore.getSnapshot()).toBe(before)
  })

  it('saves selected drafts as auto matches with both revisions, one ID each', async () => {
    const state = await generateAutoQueueDrafts({ sessionId: 's', mode: 'available', count: 2 })
    const [a, b] = state.batches.available?.drafts ?? []
    if (!a || !b) throw new Error('expected two drafts')
    await editAutoQueueDrafts({ sessionId: 's', action: 'select', draftId: b.id, selected: true })
    await editAutoQueueDrafts({ sessionId: 's', action: 'select', draftId: a.id, selected: true })
    const done = await transferAutoQueueDrafts({
      sessionId: 's',
      draftIds: [b.id, a.id],
      operationId: crypto.randomUUID(),
    })
    expect(posts()).toEqual([
      {
        path: '/api/sessions/s/matches',
        body: {
          source: 'auto',
          drafts: [b, a].map((d) => ({
            operationId: d.id,
            mode: 'available',
            lineup: { format: d.format, teamA: d.teamA, teamB: d.teamB },
          })),
          expectedQueueRevision: '7',
          expectedRevision: '4',
        },
      },
    ])
    expect(done.message).toContain('2 drafts added to Main Queue')
    expect(done.data.map((m) => m.origin)).toEqual(['auto', 'auto'])
    const after = await getAutoQueueDrafts('s')
    expect(after.batches.available?.drafts).toEqual([])
    expect(after.selectedIds).toEqual([])
    expect(after.committedIds).toEqual([b.id, a.id])
    await expect(
      transferAutoQueueDrafts({ sessionId: 's', draftIds: [a.id], operationId: 'x' }),
    ).rejects.toMatchObject({ kind: 'conflict' })
  })

  it('keeps the drafts after a lost reply and resends the same draft IDs on retry', async () => {
    const state = await generateAutoQueueDrafts({ sessionId: 's-retry', mode: 'fewest', count: 2 })
    const ids = (state.batches.fewest?.drafts ?? []).map((d) => d.id)
    const real = server.post
    server.post = () => {
      throw new TypeError('network')
    }
    await expect(
      transferAutoQueueDrafts({ sessionId: 's-retry', draftIds: ids, operationId: 'op-1' }),
    ).rejects.toMatchObject({ kind: 'timeout' })
    expect((await getAutoQueueDrafts('s-retry')).batches.fewest?.drafts).toHaveLength(2)
    server.post = real
    await transferAutoQueueDrafts({ sessionId: 's-retry', draftIds: ids, operationId: 'op-2' })
    const sent = posts().map((p) =>
      (p.body.drafts as { operationId: string }[]).map((d) => d.operationId),
    )
    expect(sent).toEqual([ids, ids])
  })

  it('surfaces a changed queue as the conflict and keeps the drafts', async () => {
    const state = await generateAutoQueueDrafts({ sessionId: 's-409', mode: 'wait', count: 2 })
    const ids = (state.batches.wait?.drafts ?? []).map((d) => d.id)
    server.post = () =>
      json(409, {
        error: {
          code: 'conflict',
          message: 'This changed since you loaded it. Refresh and try again.',
        },
      })
    await expect(
      transferAutoQueueDrafts({ sessionId: 's-409', draftIds: ids, operationId: 'op' }),
    ).rejects.toMatchObject({
      kind: 'conflict',
      message: 'This changed since you loaded it. Refresh and try again.',
    })
    const after = await getAutoQueueDrafts('s-409')
    expect(after.batches.wait?.drafts).toHaveLength(2)
    expect(after.committedIds).toEqual([])
  })

  it('refuses a draft that needs attention on the fresh read without sending it', async () => {
    const state = await generateAutoQueueDrafts({
      sessionId: 's-away',
      mode: 'available',
      count: 2,
    })
    const ids = (state.batches.available?.drafts ?? []).map((d) => d.id)
    server.absent = ['p1']
    await expect(
      transferAutoQueueDrafts({ sessionId: 's-away', draftIds: ids, operationId: 'op' }),
    ).rejects.toMatchObject({
      kind: 'conflict',
      message: expect.stringContaining('is not present'),
    })
    expect(posts()).toEqual([])
    const after = await getAutoQueueDrafts('s-away')
    expect(after.batches.available?.drafts?.every((d) => d.fingerprint !== after.fingerprint)).toBe(
      true,
    )
  })

  it('refuses drafts before the session starts', async () => {
    server.state = 'prepared'
    await expect(
      generateAutoQueueDrafts({ sessionId: 's-prep', mode: 'available', count: 2 }),
    ).rejects.toMatchObject({ kind: 'permission', message: 'Start the session first.' })
    await expect(
      generateAutoQueueDrafts({ sessionId: 's-prep', mode: 'available', count: 5 as 2 }),
    ).rejects.toMatchObject({ message: 'Choose 2, 3, 4 or 6 matches.' })
  })
})
