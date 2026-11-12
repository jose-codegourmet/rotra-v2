import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { readAccounts } from '../../src/accounts.ts'
import { busyWindows, ensureVenue, firstFreeStart } from '../../src/api/schedule.ts'
import { asAdmin, asQueueMaster } from '../../src/api/sign-in.ts'
import { readClock, resetClock, setClock } from '../../src/clock.ts'
import { QueueMasterApi } from '../../src/sim/api.ts'
import { finishRunningSessions } from '../../src/sim/engine.ts'

type Session = { id: string; state: string; revision: string; startedAt: string | null }
type Summary = { session: Session; rosterCount: number; presentCount: number }
type RosterEntry = { id: string; clubPlayerId: string; present: boolean }

const MINUTE = 60_000

test.afterAll(async () => {
  await resetClock()
})

test('admin and Queue Master sign in; a Queue Session starts and the server clock moves', async () => {
  const accounts = readAccounts()

  const admin = await asAdmin()
  const adminSession = await admin.get<{ kind: string }>('/api/auth/session')
  expect(adminSession.kind).toBe('owner')
  await admin.dispose()

  const qm = await asQueueMaster()
  const qmSession = await qm.get<{ account: { id: string } }>('/api/auth/session')
  expect(qmSession.account.id).toBe(accounts.club.clubId)

  // Re-runs share the database: reuse the venue, finish a session an earlier run left live, and
  // start in a window no earlier session takes (the clock moves there, forward only).
  const venueId = await ensureVenue(qm, 'E2E Hall')
  await finishRunningSessions(new QueueMasterApi(qm))
  const realStart = (await readClock('queue')).nowMs + MINUTE
  const start = firstFreeStart(await busyWindows(qm), realStart, 3 * 60 * MINUTE)
  if (start > realStart) await setClock(start - MINUTE)
  const now = start - MINUTE
  const created = await qm.post<{ firstSessionId: string; created: number }>('/api/sessions', {
    commandId: randomUUID(),
    input: {
      title: 'E2E Smoke Session',
      notes: '',
      venueId,
      scheduledStartAt: new Date(now + MINUTE).toISOString(),
      scheduledEndAt: new Date(now + 3 * 60 * MINUTE).toISOString(),
      sessionMode: 'fair',
      allowSingles: true,
      allowDoubles: true,
      minimumGames: 0,
      minimumIsCalculated: false,
      expectedPlayers: 8,
      courts: [{ label: 'Court 1' }, { label: 'Court 2' }],
      costEstimate: null,
    },
  })
  expect(created.created).toBe(1)
  const sessionId = created.firstSessionId

  // Registration saved every seeded player to the club.
  const { players: saved } = await qm.get<{
    players: { id: string; playerId: string | null }[]
  }>('/api/club/players')
  const seededIds = new Set(accounts.players.map((player) => player.playerId))
  const clubPlayers = saved.filter((player) => player.playerId && seededIds.has(player.playerId))
  expect(clubPlayers.length).toBe(accounts.players.length)

  const roster = await qm.post<{ results: { rosterEntry: RosterEntry | null }[] }>(
    `/api/sessions/${sessionId}/roster/batch`,
    {
      operations: clubPlayers.slice(0, 8).map((player) => ({
        op: 'add',
        operationId: randomUUID(),
        source: 'saved',
        clubPlayerId: player.id,
        level: 'intermediate_mid',
      })),
    },
  )
  expect(roster.results.filter((result) => result.rosterEntry).length).toBe(8)

  await qm.post(`/api/sessions/${sessionId}/presence`, { all: true })

  const prepared = await qm.get<Summary>(`/api/sessions/${sessionId}`)
  expect(prepared.session.state).toBe('prepared')
  expect(prepared.presentCount).toBe(8)

  const started = await qm.post<Session>(`/api/sessions/${sessionId}/start`, {
    expectedRevision: prepared.session.revision,
  })
  expect(started.state).toBe('active')

  // Move every server clock 20 minutes ahead and read the session back.
  const before = await readClock('queue')
  const clocks = await setClock(before.nowMs + 20 * MINUTE)
  for (const clock of clocks) expect(clock.offsetMs).toBeGreaterThan(19 * MINUTE)

  const live = await qm.get<Summary>(`/api/sessions/${sessionId}`)
  expect(live.session.state).toBe('active')
  expect(live.rosterCount).toBe(8)

  // The server really runs on the virtual clock: an end 15 real minutes ahead is now in the past.
  const pastEnd = await qm.send('POST', `/api/sessions/${sessionId}/end`, {
    endAt: new Date(before.realNowMs + 15 * MINUTE).toISOString(),
    expectedRevision: live.session.revision,
  })
  expect(pastEnd.status).toBe(422)
  const ended = await qm.post<Session>(`/api/sessions/${sessionId}/end`, {
    endAt: new Date(before.nowMs + 60 * MINUTE).toISOString(),
    expectedRevision: live.session.revision,
  })
  expect(ended.state).toBe('active')

  await qm.dispose()
})
