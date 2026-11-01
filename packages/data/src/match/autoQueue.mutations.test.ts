import { courtTimeOnSession, courtWindowError } from '@rotra/schema/court-window'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createConsoleFixtures, createCourtWindowFixtures } from '../fixtures/consoleSessions'
import { directoryPlayers } from '../fixtures/players'
import { connectMockBridge, DEFAULT_DEV_STATE } from '../mock/bridge'
import { setMockLatencyEnabled } from '../mock/latency'
import { loadQueueFlexibilityExample } from '../mock/queueExamples'
import { mockStore, readMockState } from '../mock/store'
import { getPublicSession } from '../public-session/fetchers'
import { addCourt, extendSession, removeCourt, updateCourt } from '../queue-session/courts'
import { startSession } from '../queue-session/mutations'
import {
  addDirectoryPlayerToSession,
  addNewPlayerToSession,
  addSavedPlayerToSession,
  confirmJoinRequest,
  giveSlot,
  submitJoinRequest,
} from '../session-roster/mutations'
import {
  editAutoQueueDrafts,
  generateAutoQueueDrafts,
  getAutoQueueDrafts,
  transferAutoQueueDrafts,
} from './autoQueue.mutations'
import { allAutoQueueDrafts, autoQueuePlayerCounts } from './autoQueue.rules'
import { completeMatch, startMatch } from './control'
import { allPlayers, canStart, freeCourts, type MatchContext } from './match.rules'
import { matchContext, removeWaitingMatch } from './queue.mutations'

const now = Date.now(),
  fixture = createConsoleFixtures(now),
  sessionId = fixture.session.id
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
    const available = await generate(),
      ahead = await generate('ahead')
    const ids = [ahead[0]!.id, available[1]!.id]
    for (const draftId of ids)
      await editAutoQueueDrafts({ sessionId, action: 'select', draftId, selected: true })
    expect((await getAutoQueueDrafts(sessionId)).selectedIds).toEqual(ids)
    expect(readMockState().matches).toEqual(fixture.matches)
    const result = await transferAutoQueueDrafts({
      sessionId,
      draftIds: ids,
      operationId: 'transfer-order',
    })
    expect(result.data.map(allPlayers)).toEqual([ahead[0], available[1]].map((d) => allPlayers(d!)))
    expect(result.data[0]!.matchNo).toBeLessThan(result.data[1]!.matchNo)
    const state = await getAutoQueueDrafts(sessionId)
    expect(state.selectedIds).toEqual([])
    expect(allAutoQueueDrafts(state)).toHaveLength(2)
  })
  it('replays a confirmation without appending and permits a separately generated rematch', async () => {
    const drafts = await generate(),
      input = { sessionId, draftIds: [drafts[0]!.id], operationId: 'repeat' }
    const first = await transferAutoQueueDrafts(input)
    const count = readMockState().matches.length
    expect(await transferAutoQueueDrafts(input)).toEqual(first)
    expect(readMockState().matches).toHaveLength(count)
    await expect(
      transferAutoQueueDrafts({ ...input, operationId: 'new-confirmation' }),
    ).rejects.toThrow('already added')
    const next = await generate()
    await transferAutoQueueDrafts({ sessionId, draftIds: [next[0]!.id], operationId: 'rematch' })
    expect(readMockState().matches).toHaveLength(count + 1)
  })
  it('fails all-or-nothing and keeps selections when a selected player is no longer present', async () => {
    const drafts = await generate(),
      ids = drafts.map((d) => d.id)
    for (const draftId of ids)
      await editAutoQueueDrafts({ sessionId, action: 'select', draftId, selected: true })
    mockStore.update((s) => {
      s.roster.find((p) => p.id === allPlayers(drafts[1]!)[0])!.present = false
    })
    const before = readMockState()
    await expect(
      transferAutoQueueDrafts({ sessionId, draftIds: ids, operationId: 'conflict' }),
    ).rejects.toThrow('not present')
    expect(readMockState()).toEqual(before)
  })
  it('keeps selected lineups fixed while regenerating and clearing unselected drafts', async () => {
    const drafts = await generate(),
      selected = drafts[0]!
    await editAutoQueueDrafts({ sessionId, action: 'select', draftId: selected.id, selected: true })
    await generateAutoQueueDrafts({
      sessionId,
      mode: 'available',
      count: 4,
      preserveSelected: true,
    })
    const regenerated = await getAutoQueueDrafts(sessionId)
    expect(regenerated.batches.available!.drafts[0]).toEqual(selected)
    await editAutoQueueDrafts({
      sessionId,
      action: 'clear',
      mode: 'available',
      unselectedOnly: true,
    })
    expect((await getAutoQueueDrafts(sessionId)).batches.available!.drafts).toEqual([selected])
    expect(readMockState().matches).toEqual(fixture.matches)
  })
  it('derives queued counts immediately on deletion and start without adding played credit', async () => {
    const drafts = await generate(),
      id = allPlayers(drafts[0]!)[0]!
    const before = autoQueuePlayerCounts(id, matchContext(readMockState(), sessionId), drafts)
    const waiting = readMockState().matches.find(
      (m) => m.state === 'waiting' && allPlayers(m).includes(id),
    )
    if (waiting) {
      await removeWaitingMatch({ sessionId, matchId: waiting.id })
      expect(
        autoQueuePlayerCounts(id, matchContext(readMockState(), sessionId), drafts).queued,
      ).toBe(before.queued - 1)
    }
    const result = await transferAutoQueueDrafts({
      sessionId,
      draftIds: [drafts[0]!.id],
      operationId: 'count',
    })
    const preStart = autoQueuePlayerCounts(id, matchContext(readMockState(), sessionId), drafts)
    await startMatch({
      matchId: result.data[0]!.id,
      courtIds: [fixture.courts[1]!.id],
      operationId: 'start-count',
    })
    const after = autoQueuePlayerCounts(id, matchContext(readMockState(), sessionId), drafts)
    expect(after.queued).toBe(preStart.queued - 1)
    expect(after.played).toBe(preStart.played)
  })
})

describe('generation failure boundaries', () => {
  it('leaves selected drafts and accepted matches intact when availability becomes insufficient', async () => {
    const drafts = await generate()
    await editAutoQueueDrafts({
      sessionId,
      action: 'select',
      draftId: drafts[0]!.id,
      selected: true,
    })
    mockStore.update((s) => {
      s.roster = s.roster.map((p, i) => ({ ...p, present: i === 0 }))
    })
    const before = readMockState()
    await expect(
      generateAutoQueueDrafts({ sessionId, mode: 'available', count: 4, preserveSelected: true }),
    ).rejects.toThrow('Made 0 of 3: not enough free players for another match.')
    expect(readMockState()).toEqual(before)
  })
})

describe('complete flexible Queue Session rules', () => {
  it('derives exactly 1 played / 2 queued, then deletion, start and eligible completion', async () => {
    const id = fixture.roster[4]!.id
    const counts = () => autoQueuePlayerCounts(id, matchContext(readMockState(), sessionId), [])
    expect(counts()).toMatchObject({ played: 1, queued: 2 })
    await removeWaitingMatch({ sessionId, matchId: fixture.matches[1]!.id })
    expect(counts()).toMatchObject({ played: 1, queued: 1 })
    const matchId = fixture.matches[2]!.id
    await startMatch({ matchId, courtIds: [fixture.courts[1]!.id], operationId: 'credit-start' })
    expect(counts()).toMatchObject({ played: 1, queued: 0 })
    await completeMatch({ matchId, winningTeam: 'A', operationId: 'credit-complete' })
    expect(counts()).toMatchObject({ played: 2, queued: 0 })
  })
  it('never gives invalid or partial participation played credit', () => {
    const game = fixture.matches.find((m) => m.substitutions.length)!
    const partials = game.substitutions.flatMap((sub) => [sub.inId, sub.outId])
    for (const id of partials)
      expect(
        autoQueuePlayerCounts(
          id,
          { ...matchContext(readMockState(), sessionId), matches: [game] },
          [],
        ).played,
      ).toBe(0)
    const invalid = fixture.matches.find((m) => m.state === 'invalid')!
    for (const id of allPlayers(invalid))
      expect(
        autoQueuePlayerCounts(
          id,
          { ...matchContext(readMockState(), sessionId), matches: [invalid] },
          [],
        ).played,
      ).toBe(0)
  })
  it('keeps stale selected drafts fixed after Main Queue changes and a partial regeneration', async () => {
    const drafts = await generate(),
      selected = drafts[0]!
    await editAutoQueueDrafts({ sessionId, action: 'select', draftId: selected.id, selected: true })
    await removeWaitingMatch({ sessionId, matchId: fixture.matches[1]!.id })
    await generateAutoQueueDrafts({
      sessionId,
      mode: 'available',
      count: 4,
      preserveSelected: true,
    })
    const state = await getAutoQueueDrafts(sessionId)
    expect(state.batches.available!.drafts[0]).toEqual(selected)
    expect(state.fingerprint).not.toBe(selected.fingerprint)
    expect(state.selectedIds).toEqual([selected.id])
  })
  it('rejects a newly-playing non-Plan-Ahead lineup without changing selection or queue', async () => {
    const drafts = await generate(),
      selected = drafts[0]!
    await editAutoQueueDrafts({ sessionId, action: 'select', draftId: selected.id, selected: true })
    mockStore.update((s) =>
      s.matches.push({
        ...s.matches[0]!,
        id: 'started-elsewhere',
        teamA: selected.teamA,
        teamB: selected.teamB,
        courtIds: [fixture.courts[1]!.id],
      }),
    )
    const before = readMockState()
    await expect(
      transferAutoQueueDrafts({
        sessionId,
        draftIds: [selected.id],
        operationId: 'playing-conflict',
      }),
    ).rejects.toThrow('now playing')
    expect(readMockState()).toEqual(before)
  })
  it('accepts a Plan Ahead dependency without claiming another court', async () => {
    mockStore.update((s) => {
      s.roster = s.roster.map((p, i) => ({ ...p, present: i < 5 }))
    })
    const drafts = await generate('ahead')
    const before = readMockState().matches.filter((m) => m.state === 'active')
    const result = await transferAutoQueueDrafts({
      sessionId,
      draftIds: [drafts[0]!.id],
      operationId: 'ahead',
    })
    expect(result.data[0]!.courtIds).toEqual([])
    expect(result.data[0]!.state).toBe('waiting')
    expect(readMockState().matches.filter((m) => m.state === 'active')).toEqual(before)
  })
  it('keeps the complete workspace and Main Queue unchanged on save failure or conflict', async () => {
    const drafts = await generate()
    for (const key of ['nextSaveFails', 'nextSaveConflict'] as const) {
      let flags = { ...DEFAULT_DEV_STATE, [key]: true }
      const disconnect = connectMockBridge({
        read: () => flags,
        consume: (key) => {
          flags = { ...flags, [key]: false }
        },
      })
      const before = readMockState()
      await expect(
        transferAutoQueueDrafts({ sessionId, draftIds: [drafts[0]!.id], operationId: key }),
      ).rejects.toThrow()
      expect(readMockState()).toEqual(before)
      disconnect()
    }
  })
  it('supports downloaded offline draft/transfer writes and rejects a missing copy', async () => {
    const disconnect = connectMockBridge({
      read: () => ({ ...DEFAULT_DEV_STATE, offline: true }),
      consume: () => {},
    })
    try {
      await expect(generate()).rejects.toThrow('No downloaded copy')
      mockStore.update((s) => {
        s.downloads[sessionId] = 'ready'
      })
      const drafts = await generate()
      const result = await transferAutoQueueDrafts({
        sessionId,
        draftIds: [drafts[0]!.id],
        operationId: 'offline',
      })
      expect(result.data).toHaveLength(1)
      expect(readMockState().sync.pendingCount).toBe(1)
    } finally {
      disconnect()
    }
  })
  it('keeps finalized/invalid sessions read-only and preserves active expired-license boundaries', async () => {
    for (const state of ['completed', 'invalid'] as const) {
      mockStore.update((s) => {
        s.sessions[0]!.state = state
      })
      await expect(generate()).rejects.toThrow('read-only')
    }
    mockStore.update((s) => {
      s.sessions[0]!.state = 'active'
    })
    const disconnect = connectMockBridge({
      read: () => ({ ...DEFAULT_DEV_STATE, licenseExpired: true }),
      consume: () => {},
    })
    try {
      expect(await generate()).toHaveLength(2)
    } finally {
      disconnect()
    }
  })
  it('admits the chosen second waiter as player 37, retains the no-show and refreshes public counts', async () => {
    loadQueueFlexibilityExample('admission')
    const before = readMockState(),
      second = before.waitlist[1]!
    await giveSlot({ sessionId, waitlistId: second.id })
    const state = readMockState(),
      late = state.roster.find((p) => p.clubPlayerId === second.clubPlayerId)!
    expect(state.roster.filter((p) => p.sessionId === sessionId)).toHaveLength(37)
    expect(late.present).toBe(true)
    expect(late.levelLockedAt).not.toBeNull()
    expect(
      state.roster.find(
        (p) => p.id === before.roster.find((r) => r.sessionId === sessionId && !r.present)!.id,
      )!.present,
    ).toBe(false)
    expect(state.waitlist.map((w) => w.id)).toEqual([
      before.waitlist[0]!.id,
      before.waitlist[2]!.id,
    ])
    const page = await getPublicSession(state.sessions.find((s) => s.id === sessionId)!.publicSlug)
    expect(page.participants).toHaveLength(37)
    const generated = await generateAutoQueueDrafts({ sessionId, mode: 'available', count: 2 })
    expect(generated).toBeDefined()
    // Force the late player into the next explicit batch without excluding them at the plan boundary.
    mockStore.update((s) => {
      s.roster = s.roster.map((p) => ({
        ...p,
        present:
          p.id === late.id ||
          s.roster
            .filter((r) => r.sessionId === sessionId)
            .slice(1, 4)
            .some((other) => other.id === p.id),
      }))
    })
    expect((await generate()).flatMap(allPlayers)).toContain(late.id)
  })
  it('waitlists prepared overflow, starts without admitting waiters, then admits all existing sources live', async () => {
    mockStore.update((s) => {
      s.sessions[0]!.state = 'prepared'
      s.sessions[0]!.playersPerCourt = 2
      s.courts = s.courts.slice(0, 1)
      s.matches = []
    })
    const candidate = readMockState().clubPlayers.find(
      (p) => !fixture.roster.some((r) => r.clubPlayerId === p.id),
    )!
    const prepared = await addSavedPlayerToSession({
      sessionId,
      clubPlayerId: candidate.id,
      level: 'intermediate_mid',
    })
    expect(prepared.data.waitlistPosition).toBe(1)
    const before = readMockState()
    await startSession(sessionId)
    expect(readMockState().waitlist).toEqual(before.waitlist)
    expect(readMockState().roster).toHaveLength(before.roster.length)
    const saved = readMockState().clubPlayers.find(
      (p) => !readMockState().roster.some((r) => r.clubPlayerId === p.id) && p.id !== candidate.id,
    )!
    expect(
      (
        await addSavedPlayerToSession({
          sessionId,
          clubPlayerId: saved.id,
          level: 'intermediate_mid',
        })
      ).data.waitlistPosition,
    ).toBe(0)
    expect(
      (
        await addDirectoryPlayerToSession({
          sessionId,
          playerId: directoryPlayers[0]!.id,
          level: 'intermediate_mid',
        })
      ).data.waitlistPosition,
    ).toBe(0)
    expect(
      (await addNewPlayerToSession({ sessionId, name: 'Walk-in guest', level: 'intermediate_mid' }))
        .data.waitlistPosition,
    ).toBe(0)
    const request = await submitJoinRequest({
      sessionId,
      name: 'Requested guest',
      statedBand: 'intermediate',
    })
    expect(readMockState().joinRequests.find((r) => r.id === request.data.requestId)!.status).toBe(
      'pending',
    )
    expect(
      (await confirmJoinRequest({ requestId: request.data.requestId, level: 'intermediate_mid' }))
        .data.waitlistPosition,
    ).toBe(0)
    await giveSlot({ sessionId, waitlistId: readMockState().waitlist[0]!.id })
    expect(readMockState().waitlist).toHaveLength(0)
    const snapshot = readMockState()
    await expect(
      addSavedPlayerToSession({ sessionId, clubPlayerId: saved.id, level: 'intermediate_mid' }),
    ).rejects.toThrow('already on')
    expect(readMockState()).toEqual(snapshot)
  })
  it('uses three courts before 8:30, five after opening, and keeps Court 5 eligible after 9:30', () => {
    const sample = createCourtWindowFixtures(now),
      start = sample.session.scheduledStartAt
    expect(freeCourts(sample.courts, [], start + 3600000 - 1)).toHaveLength(3)
    expect(freeCourts(sample.courts, [], start + 3600000)).toHaveLength(5)
    expect(freeCourts(sample.courts, [], start + 7200000)).toHaveLength(5)
    const ids = sample.roster
      .filter((p) => p.present)
      .slice(0, 10)
      .map((p) => p.id)
    const futureMatch = {
      ...fixture.matches[1]!,
      format: 'fun_5v5' as const,
      teamA: ids.slice(0, 5),
      teamB: ids.slice(5),
    }
    const ctx: MatchContext = {
      roster: sample.roster,
      matches: [],
      courts: sample.courts,
      now: start,
    }
    const chosenCourts = sample.courts.slice(3).map((c) => c.id)
    expect(canStart(futureMatch, chosenCourts, ctx)).toBe(false)
    ctx.now = start + 3600000
    expect(canStart(futureMatch, chosenCourts, ctx)).toBe(true)
    ctx.courts[4]!.removedAt = start + 3600000
    expect(canStart(futureMatch, chosenCourts, ctx)).toBe(false)
  })
  it('edits an ended booking, locks a used start, preserves fixed ends on extension, and guards closure', async () => {
    loadQueueFlexibilityExample('courts')
    const state = readMockState(),
      session = state.sessions.find((s) => s.id === sessionId)!,
      court = state.courts.filter((c) => c.sessionId === sessionId)[4]!
    const clock = vi.spyOn(Date, 'now').mockReturnValue(court.openUntil! + 60000)
    try {
      await updateCourt({
        sessionId,
        courtId: court.id,
        label: court.label,
        startsAt: court.startsAt!,
        openUntil: session.scheduledEndAt,
      })
      const baseline = readMockState().matches
      mockStore.update((s) => {
        s.matches.push({ ...fixture.matches[0]!, id: 'occupied-window', courtIds: [court.id] })
      })
      await expect(removeCourt({ sessionId, courtId: court.id })).rejects.toThrow(
        'Only a free court',
      )
      await expect(
        updateCourt({
          sessionId,
          courtId: court.id,
          label: court.label,
          startsAt: court.startsAt! + 60000,
          openUntil: session.scheduledEndAt,
        }),
      ).rejects.toThrow('fixed after use')
      await extendSession({ sessionId, minutes: 30 })
      expect(readMockState().courts.find((c) => c.id === court.id)!.openUntil).toBe(
        session.scheduledEndAt,
      )
      mockStore.update((s) => {
        s.matches = baseline
      })
      await removeCourt({ sessionId, courtId: court.id })
      expect(readMockState().courts.find((c) => c.id === court.id)!.removedAt).not.toBeNull()
      const remaining = readMockState().courts.filter(
        (c) => c.sessionId === sessionId && !c.removedAt,
      )
      for (const c of remaining.slice(1)) await removeCourt({ sessionId, courtId: c.id })
      await expect(removeCourt({ sessionId, courtId: remaining[0]!.id })).rejects.toThrow(
        'At least one',
      )
      expect(readMockState().sessions.find((s) => s.id === sessionId)!.minimumGames).toBe(
        session.minimumGames,
      )
    } finally {
      clock.mockRestore()
    }
  })
  it('opens default courts at an early actual start and allows an earlier live booking', async () => {
    const actualStart = new Date(2026, 10, 1, 12, 6).getTime()
    const scheduledStart = new Date(2026, 10, 1, 18).getTime()
    mockStore.update((s) => {
      s.sessions[0]!.state = 'prepared'
      s.sessions[0]!.startedAt = null
      s.sessions[0]!.scheduledStartAt = scheduledStart
      s.sessions[0]!.scheduledEndAt = new Date(2026, 10, 1, 23).getTime()
      s.matches = []
      s.courts.forEach((c, i) => {
        c.startsAt = i === 2 ? scheduledStart + 3600000 : scheduledStart
      })
    })
    const clock = vi.spyOn(Date, 'now').mockReturnValue(actualStart)
    try {
      await startSession(sessionId)
      const courts = readMockState().courts
      expect(freeCourts(courts, [], actualStart)).toHaveLength(courts.length - 1)
      expect(courts[2]!.startsAt).toBe(scheduledStart + 3600000)
      const added = await addCourt({
        sessionId,
        label: 'Early court',
        startsAt: actualStart + 60000,
        openUntil: scheduledStart,
      })
      expect(added.data.startsAt).toBe(actualStart + 60000)
      await expect(
        addCourt({
          sessionId,
          label: 'Too early',
          startsAt: actualStart - 60000,
          openUntil: scheduledStart,
        }),
      ).rejects.toThrow('within the session')
      expect(readMockState().sessions[0]!.scheduledStartAt).toBe(scheduledStart)
    } finally {
      clock.mockRestore()
    }
  })
  it('validates overnight booking windows against session boundaries', () => {
    const start = new Date(2026, 10, 1, 22).getTime(),
      end = new Date(2026, 10, 2, 2).getTime()
    expect(courtTimeOnSession(start + 34567, '22:00')).toBe(start + 34567)
    const nextDay = courtTimeOnSession(start, '00:30')
    expect(new Date(nextDay).getDate()).toBe(2)
    expect(courtWindowError(nextDay, null, start, end)).toBeNull()
    expect(courtWindowError(nextDay, start, start, end)).toContain('after the planned start')
    expect(courtWindowError(nextDay, end + 60000, start, end)).toContain('extend the session first')
  })
})
