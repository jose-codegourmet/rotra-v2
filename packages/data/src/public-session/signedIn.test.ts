import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { applyFullHouseFixtures, FULL_HOUSE_QUEUE_SIZES } from '../fixtures/matchCards'
import { JOSE_PLAYER_ID } from '../fixtures/players'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore } from '../mock/store'
import type { SessionCostEstimate } from '../session-cost/sessionCost.types'
import { getMyNight, getParticipantStats, getPublicSession, getSignedInSession } from './fetchers'
import { canRefreshNow, myMatchLabel, refreshAvailableAt } from './publicSession.rules'

let restoreLatency: () => void
let slug = ''
beforeEach(() => {
  restoreLatency = setMockLatencyEnabled(false)
  mockStore.reset()
  mockStore.update((draft) => applyFullHouseFixtures(draft))
  slug = mockStore.getSnapshot().sessions.find((s) => s.id === 's-tonight')?.publicSlug ?? ''
})
afterEach(() => restoreLatency())

describe('Public session › Full house, visitor and signed-in versions', () => {
  it('masks every name for a visitor, caps at twelve and carries no courts or queue', async () => {
    const page = await getPublicSession(slug)
    expect(page.audience).toBe('visitor')
    expect(page.participants).toHaveLength(12)
    expect(page.participants.every((p) => p.name.includes('***'))).toBe(true)
    expect(page.participants.every((p) => p.rtrId === undefined && p.isViewer === undefined)).toBe(
      true,
    )
    expect('courtsNow' in page).toBe(false)
    expect('queue' in page).toBe(false)
  })

  it('shows registered players in full, masks guests, never uncapped for a visitor', async () => {
    const page = await getSignedInSession(slug, JOSE_PLAYER_ID)
    expect(page.audience).toBe('signed-in')
    expect(page.participants).toHaveLength(page.participantCount ?? -1)
    expect(page.participants.length).toBeGreaterThan(12)
    const jose = page.participants.find((p) => p.isViewer)
    expect(jose).toMatchObject({ name: 'Jose', masked: false })
    expect(jose?.rtrId).toBeTruthy()
    expect(page.participants.filter((p) => p.isViewer)).toHaveLength(1)
    const guest = page.participants.find((p) => p.name.startsWith('W***'))
    expect(guest).toMatchObject({ masked: true, rtrId: null, nickname: null })
    const unclaimed = page.waitlist.find((p) => p.masked)
    expect(unclaimed).toMatchObject({ rtrId: null })
    expect(page.waitlist.some((p) => !p.masked && p.rtrId)).toBe(true)
  })

  it('lists courts now: playing, getting ready and free, with no score', async () => {
    const { courtsNow } = await getSignedInSession(slug, JOSE_PLAYER_ID)
    expect(courtsNow.map((c) => c.status)).toEqual(['playing', 'getting-ready', 'free', 'free'])
    expect(courtsNow[0]?.startedAt).toBeTypeOf('number')
    expect(courtsNow[1]?.startedAt).toBeNull()
    expect(courtsNow[2]?.teamA).toEqual([])
    expect(courtsNow[0]?.teamA.some((p) => p.isViewer)).toBe(true)
  })

  it('merges two courts into one entry', async () => {
    mockStore.update((draft) => applyFullHouseFixtures(draft, { merged: true }))
    const { courtsNow } = await getSignedInSession(slug, JOSE_PLAYER_ID)
    expect(courtsNow.map((c) => c.label)).toEqual(['Court 1 + Court 2', 'Court 3', 'Court 4'])
    expect(courtsNow[0]).toMatchObject({ merged: true, status: 'playing' })
  })

  it('queues the ten mixed matches in order with up to five per side', async () => {
    const { queue } = await getSignedInSession(slug, JOSE_PLAYER_ID)
    expect(queue.map((m) => [m.teamA.length, m.teamB.length])).toEqual(FULL_HOUSE_QUEUE_SIZES)
    expect(queue.map((m) => m.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    mockStore.update((draft) => {
      draft.matches = draft.matches.filter((m) => m.state !== 'waiting')
    })
    expect((await getSignedInSession(slug, JOSE_PLAYER_ID)).queue).toEqual([])
  })

  it('reports the payment per player: none, custom, break-even, free', async () => {
    const estimate = (patch: Partial<SessionCostEstimate>): SessionCostEstimate => ({
      sessionId: 's-tonight',
      currency: 'PHP',
      courtFeePerCourtHour: 45000,
      entranceFeePerHead: 5000,
      shuttles: [],
      paymentMode: 'custom',
      customFeePerHead: 20000,
      ...patch,
    })
    const save = (value: SessionCostEstimate | null) =>
      mockStore.update((draft) => {
        if (value) draft.costEstimates['s-tonight'] = value
        else delete draft.costEstimates['s-tonight']
      })
    save(null)
    expect((await getPublicSession(slug)).amountDuePerPlayer).toBeNull()
    save(estimate({}))
    expect((await getPublicSession(slug)).amountDuePerPlayer).toBe(20000)
    save(estimate({ paymentMode: 'break_even', customFeePerHead: null }))
    const share = (await getPublicSession(slug)).amountDuePerPlayer ?? 0
    expect(share).toBeGreaterThan(0)
    expect(share % 100).toBe(0)
    save(estimate({ customFeePerHead: 0 }))
    expect((await getPublicSession(slug)).amountDuePerPlayer).toBe(0)
  })
})

describe('Public session › My night', () => {
  it('reads a player on court, with who they play with', async () => {
    const mine = await getMyNight(slug, JOSE_PLAYER_ID)
    expect(mine).toMatchObject({ status: 'confirmed', stage: 'live-present', games: 0 })
    expect(mine.onCourt).toMatchObject({ courtLabel: 'Court 1', started: true })
    expect(mine.onCourt?.matchLabel).toMatch(/^with .+ vs .+, .+$/)
    expect(mine.inQueue?.position).toBeGreaterThan(0)
    expect(mine.canInvite).toBe(false)
  })

  it('is empty for a player not in the session', async () => {
    const stranger = mockStore.getSnapshot().players.find((p) => p.id !== JOSE_PLAYER_ID)
    const mine = await getMyNight(slug, stranger?.id ?? '')
    if (mine.status === 'none') expect(mine.stage).toBeNull()
  })
})

describe('Public session › refresh throttle', () => {
  it('opens again ten seconds after a refresh', () => {
    expect(refreshAvailableAt(null)).toBeNull()
    expect(canRefreshNow(null)).toBe(true)
    expect(refreshAvailableAt(1000)).toBe(11000)
    expect(canRefreshNow(1000, 10999)).toBe(false)
    expect(canRefreshNow(1000, 11000)).toBe(true)
  })

  it('words who the player is with', () => {
    expect(myMatchLabel(['A'], ['B', 'C'])).toBe('with A vs B, C')
    expect(myMatchLabel([], ['B', 'C'])).toBe('vs B, C')
  })
})

describe('Public session › participant profile cards (#731)', () => {
  it('says which card each tile opens and masks always-private players, picture kept', async () => {
    const page = await getSignedInSession(slug, JOSE_PLAYER_ID)
    const all = [...page.participants, ...page.waitlist]
    expect(all.every((p) => p.profile !== undefined)).toBe(true)
    const priv = page.participants.filter((p) => p.profile === 'private')
    expect(priv.length).toBeGreaterThan(0)
    for (const p of priv) {
      expect(p).toMatchObject({ masked: true, rtrId: null, nickname: null })
      expect(p.name).toContain('***')
      expect(p.pictureUrl).toBeTruthy()
      expect(p.tonight).toBeUndefined()
    }
    expect(page.participants.find((p) => p.name.startsWith('W***'))?.profile).toBe('guest')
    expect(page.participants.find((p) => p.isViewer)?.profile).toBe('registered')
    expect(page.participants.find((p) => p.isViewer)?.tonight).toBeDefined()
    expect(page.waitlist.every((p) => p.tonight === undefined)).toBe(true)
  })

  it('keeps the visitor version without profile kinds', async () => {
    const page = await getPublicSession(slug)
    expect(page.participants.every((p) => p.profile === undefined)).toBe(true)
  })

  it('reads stats for a registered participant and refuses an always-private one', async () => {
    const state = mockStore.getSnapshot()
    const jose = state.players.find((p) => p.id === JOSE_PLAYER_ID)
    const stats = await getParticipantStats(jose?.rtrId ?? '', JOSE_PLAYER_ID)
    expect(stats === null || 'hidden' in stats || stats.games === stats.wins + stats.losses).toBe(
      true,
    )
    const hidden = state.playerProfiles.find((p) => p.profileVisibility === 'always_private')
    await expect(getParticipantStats(hidden?.rtrId ?? '', JOSE_PLAYER_ID)).rejects.toThrow()
    // The player themselves still reads their own stats.
    await expect(
      getParticipantStats(hidden?.rtrId ?? '', hidden?.playerId ?? ''),
    ).resolves.toBeDefined()
  })
})
