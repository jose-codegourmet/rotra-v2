import { validateSessionCost } from '../session-cost/validation'
import { normalizeSessionCost } from '../session-cost/sessionCost.rules'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { checkMockSave, getMockDevState, requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { required } from '../mock/required'
import { type MockState, mockStore } from '../mock/store'
import { queueMutation, sessionIn } from '../mock/transaction'
import type { SessionWaitlistEntry } from '../session-roster/sessionRoster.types'
import {
  estimateMinimum,
  rebalanceSlots,
  sessionMinutes,
  sessionOccurrences,
  slotCapacity,
  startBlocker,
} from './queueSession.rules'
import type { QueueSession, QueueSessionInput } from './queueSession.types'
export function recomputeMinimum(state: MockState, id: string) {
  const s = sessionIn(state, id)
  if (s.state !== 'prepared' || !s.minimumIsCalculated) return
  const courts = state.courts.filter((c) => c.sessionId === id && !c.removedAt).length
  s.minimumGames = estimateMinimum({
    courts,
    minutes: sessionMinutes(s.scheduledStartAt, s.scheduledEndAt),
    players:
      state.roster.filter((p) => p.sessionId === id).length ||
      s.expectedPlayers ||
      slotCapacity(courts, s.playersPerCourt),
    allowSingles: s.allowSingles,
    allowDoubles: s.allowDoubles,
  }).low
}
export function promoteWaiter(state: MockState, entry: SessionWaitlistEntry, now = Date.now()) {
  const s = sessionIn(state, entry.sessionId),
    p = state.clubPlayers.find((p) => p.id === entry.clubPlayerId)
  if (!p || !entry.level) throw new MockError('permission', 'Choose a level before giving a slot.')
  state.roster.push({
    id: crypto.randomUUID(),
    sessionId: s.id,
    clubPlayerId: p.id,
    nameSnapshot: p.fullName,
    nicknameSnapshot: p.nickname,
    level: entry.level,
    confirmedAt: now,
    present: s.state === 'active',
    presentChangedAt: s.state === 'active' ? now : null,
    levelLockedAt: s.state === 'active' ? now : null,
  })
  state.waitlist = state.waitlist.filter((w) => w.id !== entry.id)
}
function validate(state: MockState, input: QueueSessionInput) {
  validateSessionCost(
    input.costEstimate,
    state.inventory.filter((i) => i.clubId === DEMO_CLUB_ID),
  )
  const venue = state.venues.find((v) => v.id === input.venueId && v.clubId === DEMO_CLUB_ID)
  if (
    !venue ||
    !input.title.trim() ||
    !input.courts.length ||
    input.courts.some((c) => !c.label.trim()) ||
    !Number.isFinite(input.scheduledStartAt) ||
    !Number.isFinite(input.scheduledEndAt)
  )
    throw new MockError('permission', 'Enter a title, venue, date, time and at least one court.')
  if (
    input.expectedPlayers !== null &&
    (!Number.isInteger(input.expectedPlayers) || input.expectedPlayers < 1)
  )
    throw new MockError('permission', 'Enter a whole number of players.')
  if (!Number.isInteger(input.minimumGames) || input.minimumGames < 0)
    throw new MockError('permission', 'Enter a whole number of games.')
  const budget =
    input.playersPerCourt ??
    state.clubs.find((c) => c.id === DEMO_CLUB_ID)?.defaultPlayersPerCourt ??
    8
  if (!Number.isInteger(budget) || budget < 2 || budget > 20)
    throw new MockError('permission', 'Players per court must be between 2 and 20.')
  return { venue, budget }
}
export function createQueueSession(input: QueueSessionInput) {
  return queueMutation({ area: 'Session', onlineOnly: true, clubAccess: true }, (state) => {
    const { venue, budget } = validate(state, input),
      occurrences = sessionOccurrences(
        { ...input, id: undefined },
        state.sessions.filter((s) => s.clubId === DEMO_CLUB_ID),
      ),
      free = occurrences.filter((o) => !o.clash)
    if (!free.length)
      throw new MockError(
        'conflict',
        occurrences.length > 1
          ? 'Every date clashes with another session. Change the start date, time or venue.'
          : `${occurrences[0]?.clash?.text}. Pick another date or time.`,
      )
    const seriesId = occurrences.length > 1 ? crypto.randomUUID() : null,
      ids: string[] = []
    for (const date of free) {
      const id = crypto.randomUUID()
      ids.push(id)
      const s: QueueSession = {
        id,
        clubId: DEMO_CLUB_ID,
        title: input.title.trim(),
        notes: input.notes,
        scheduledStartAt: date.start,
        scheduledEndAt: date.end,
        venueId: venue.id,
        venueName: venue.name,
        venueAddress: venue.address,
        state: 'prepared',
        invalidReason: null,
        sessionMode: input.sessionMode,
        allowSingles: input.allowSingles,
        allowDoubles: input.allowDoubles,
        minimumGames: input.minimumGames,
        minimumIsCalculated: input.minimumIsCalculated,
        playersPerCourt: budget,
        expectedPlayers: input.expectedPlayers,
        startedAt: null,
        finalizedAt: null,
        playerRecordsUpdatedAt: null,
        seriesId,
        publicSlug: id,
        acceptJoinRequests: true,
      }
      state.sessions.push(s)
      const cost = normalizeSessionCost(input.costEstimate)
      if (cost) state.costEstimates[id] = { ...cost, sessionId: id, currency: 'PHP' }
      state.courts.push(
        ...input.courts.map((c) => ({
          id: crypto.randomUUID(),
          sessionId: id,
          label: c.label.trim(),
          openUntil: c.openUntil ?? null,
          removedAt: null,
        })),
      )
      recomputeMinimum(state, id)
    }
    const created = ids.length,
      skipped = occurrences.length - created
    return {
      data: { firstSessionId: required(ids[0]), created, skipped },
      text:
        occurrences.length === 1
          ? 'Session created'
          : `${created} sessions created${skipped ? ` · ${skipped} clashing date${skipped === 1 ? '' : 's'} skipped` : ''}`,
    }
  })
}
export function updateQueueSession({
  sessionId,
  values,
}: {
  sessionId: string
  values: QueueSessionInput
}) {
  return queueMutation(
    { area: 'Session', onlineOnly: true, clubAccess: true, sessionId },
    (state) => {
      const s = sessionIn(state, sessionId)
      if (s.state !== 'prepared')
        throw new MockError('permission', 'Only prepared sessions can be edited.')
      const { venue, budget } = validate(state, values),
        date = required(
          sessionOccurrences({ ...values, id: sessionId, repeat: 'none' }, state.sessions)[0],
        )
      if (date.clash)
        throw new MockError('conflict', `${date.clash.text}. Pick another date or time.`)
      if (values.costEstimate !== undefined) {
        const cost = normalizeSessionCost(values.costEstimate)
        if (cost) state.costEstimates[sessionId] = { ...cost, sessionId, currency: 'PHP' }
        else delete state.costEstimates[sessionId]
      }
      Object.assign(s, {
        title: values.title.trim(),
        notes: values.notes,
        venueId: venue.id,
        venueName: venue.name,
        venueAddress: venue.address,
        scheduledStartAt: date.start,
        scheduledEndAt: date.end,
        sessionMode: values.sessionMode,
        allowSingles: values.allowSingles,
        allowDoubles: values.allowDoubles,
        minimumGames: values.minimumGames,
        minimumIsCalculated: values.minimumIsCalculated,
        expectedPlayers: values.expectedPlayers,
        playersPerCourt: budget,
      })
      state.courts = state.courts.filter((c) => c.sessionId !== sessionId)
      state.courts.push(
        ...values.courts.map((c) => ({
          id: crypto.randomUUID(),
          sessionId,
          label: c.label.trim(),
          openUntil: c.openUntil ?? null,
          removedAt: null,
        })),
      )
      const b = rebalanceSlots(
        state.roster.filter((p) => p.sessionId === sessionId),
        state.waitlist.filter((w) => w.sessionId === sessionId),
        slotCapacity(values.courts.length, budget),
      )
      const earliest =
        Math.min(
          Date.now(),
          ...state.waitlist.filter((w) => w.sessionId === sessionId).map((w) => w.addedAt),
        ) - b.movedOut.length
      state.roster = state.roster.filter((p) => !b.movedOut.some((m) => m.id === p.id))
      state.waitlist.push(
        ...b.movedOut.map((p, i) => ({
          id: crypto.randomUUID(),
          sessionId,
          clubPlayerId: p.clubPlayerId,
          level: p.level,
          addedAt: earliest + i,
        })),
      )
      for (const w of b.movedIn) promoteWaiter(state, w)
      recomputeMinimum(state, sessionId)
      return {
        data: s,
        text: `Preparation saved${b.movedOut.length ? ` · ${b.movedOut.length} players moved to the waitlist` : b.movedIn.length ? ` · ${b.movedIn.length} players moved from the waitlist` : ''}`,
      }
    },
  )
}
export async function downloadSession(sessionId: string) {
  requireOnline()
  const s = mockStore.getSnapshot().sessions.find((s) => s.id === sessionId)
  if (!s || !['prepared', 'active'].includes(s.state))
    throw new MockError('permission', 'Session not available.')
  if (mockStore.getSnapshot().downloads[sessionId] === 'downloading')
    throw new MockError('conflict', 'This session is already downloading.')
  checkMockSave()
  const generation = mockStore.getGeneration()
  const previous = mockStore.getSnapshot().downloads[sessionId] ?? 'none'
  mockStore.update((s) => {
    s.downloads[sessionId] = 'downloading'
  })
  try {
    await delay(1500)
    if (generation !== mockStore.getGeneration())
      throw new MockError('conflict', 'Demo data was reset. Download again.')
    requireOnline()
    if (getMockDevState().downloadFails)
      throw new MockError(
        'retryable',
        previous === 'ready'
          ? 'Download failed. Your previous copy is kept.'
          : 'Download failed. Try again when connected.',
      )
    mockStore.update((s) => {
      s.downloads[sessionId] = 'ready'
      s.downloadInfo[sessionId] = { downloadedAt: Date.now() }
    })
    return { message: 'Ready on this device' }
  } catch (error) {
    if (generation === mockStore.getGeneration())
      mockStore.update((s) => {
        s.downloads[sessionId] = previous
        s.downloadInfo[sessionId] = {
          downloadedAt: s.downloadInfo[sessionId]?.downloadedAt ?? null,
          error: error instanceof Error ? error.message : 'Download failed.',
        }
      })
    throw error
  }
}
export function startSession(sessionId: string) {
  return queueMutation({ area: 'Session' }, (state) => {
    const s = sessionIn(state, sessionId)
    if (s.state !== 'prepared')
      throw new MockError('permission', 'Only a prepared session can start.')
    const roster = state.roster.filter((p) => p.sessionId === sessionId),
      reason = startBlocker(s, {
        sessions: state.sessions,
        roster,
        ...getMockDevState(),
        downloaded: state.downloads[sessionId] === 'ready',
      })
    if (reason) throw new MockError('permission', reason)
    recomputeMinimum(state, sessionId)
    const now = Date.now()
    s.state = 'active'
    s.startedAt = now
    for (const p of roster) {
      p.levelLockedAt = now
      if (p.present) p.presentChangedAt = now
    }
    return { data: s, text: 'Session started · levels locked' }
  })
}
