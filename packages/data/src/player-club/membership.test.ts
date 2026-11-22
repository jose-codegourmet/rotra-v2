import { describe, expect, it } from 'vitest'
import type { MockState } from '../mock/store'
import {
  activateClubMembership,
  cancelPendingTransfersOnLeave,
  endTrustedHostsOnLeave,
} from './membership'

const state = (extra: Record<string, unknown> = {}) =>
  ({
    clubPlayers: [],
    playerProfiles: [{ playerId: 'p1', fullName: 'Ana Cruz', nickname: 'Ana' }],
    sessions: [
      { id: 's1', clubId: 'c1' },
      { id: 's2', clubId: 'c2' },
    ],
    slotTransfers: [],
    ...extra,
  }) as unknown as MockState

const transfer = (id: string, sessionId: string, over: Record<string, unknown>) => ({
  id,
  sessionId,
  senderPlayerId: 'other',
  recipientPlayerId: null,
  status: 'pending',
  decidedAt: null,
  ...over,
})

describe('activateClubMembership', () => {
  it('creates one membership and never a duplicate', () => {
    const s = state()
    activateClubMembership(s, 'p1', 'c1', 'session')
    activateClubMembership(s, 'p1', 'c1', 'club')
    expect(s.clubPlayers).toHaveLength(1)
    expect(s.clubPlayers[0]?.joinedVia).toBe('session')
  })
  it('allows several clubs', () => {
    const s = state()
    activateClubMembership(s, 'p1', 'c1', 'session')
    activateClubMembership(s, 'p1', 'c2', 'club')
    expect(s.clubPlayers).toHaveLength(2)
  })
  it('reactivates the same record after leaving', () => {
    const s = state()
    const first = activateClubMembership(s, 'p1', 'c1', 'session')
    if (first) first.removedAt = 5
    const again = activateClubMembership(s, 'p1', 'c1', 'club')
    expect(again?.id).toBe(first?.id)
    expect(again?.removedAt).toBeUndefined()
    expect(s.clubPlayers).toHaveLength(1)
  })
  it('refuses a player with no profile', () => {
    expect(activateClubMembership(state(), 'nobody', 'c1', 'club')).toBeNull()
  })
})

describe('cancelPendingTransfersOnLeave', () => {
  it('cancels pending transfers of the player in that club only', () => {
    const s = state({
      slotTransfers: [
        transfer('t1', 's1', { senderPlayerId: 'p1' }),
        transfer('t2', 's1', { recipientPlayerId: 'p1' }),
        transfer('t3', 's2', { senderPlayerId: 'p1' }),
        transfer('t4', 's1', { senderPlayerId: 'p1', status: 'approved', decidedAt: 1 }),
        transfer('t5', 's1', {}),
      ],
    })
    expect(cancelPendingTransfersOnLeave(s, 'p1', 'c1', 99)).toBe(2)
    const by = Object.fromEntries((s.slotTransfers ?? []).map((t) => [t.id, t.status]))
    expect(by).toEqual({
      t1: 'cancelled',
      t2: 'cancelled',
      t3: 'pending',
      t4: 'approved',
      t5: 'pending',
    })
  })
})

describe('endTrustedHostsOnLeave', () => {
  const host = (id: string, clubPlayerId: string, removedAt: number | null = null) => ({
    id,
    clubId: 'c1',
    clubPlayerId,
    addedAt: 1,
    removedAt,
  })
  it('ends the current trusted-host row of the records left, keeps history and session hosts', () => {
    const s = state({
      clubPlayers: [
        { id: 'cp1', clubId: 'c1', playerId: 'p1', removedAt: 50 },
        { id: 'cp0', clubId: 'c1', removedAt: 10, linkedToClubPlayerId: 'cp1' },
        { id: 'cp2', clubId: 'c1', playerId: 'p2' },
      ],
      clubTrustedHosts: [
        host('h-old', 'cp1', 5),
        host('h1', 'cp1'),
        host('h0', 'cp0'),
        host('h2', 'cp2'),
      ],
      sessionHosts: [{ id: 'sh1', clubPlayerId: 'cp1', removedAt: null }],
    })
    expect(endTrustedHostsOnLeave(s, ['cp1'], 99)).toBe(2)
    const by = Object.fromEntries((s.clubTrustedHosts ?? []).map((h) => [h.id, h.removedAt]))
    expect(by).toEqual({ 'h-old': 5, h1: 99, h0: 99, h2: null })
    expect(s.clubTrustedHosts).toHaveLength(4)
    expect(
      (s as unknown as { sessionHosts: { removedAt: null }[] }).sessionHosts[0]?.removedAt,
    ).toBeNull()
  })
  it('is not restored when the player rejoins', () => {
    const s = state({ clubTrustedHosts: [] })
    const member = activateClubMembership(s, 'p1', 'c1', 'club')
    if (!member) throw new Error('no member')
    s.clubTrustedHosts?.push(host('h1', member.id))
    member.removedAt = 50
    endTrustedHostsOnLeave(s, [member.id], 60)
    const again = activateClubMembership(s, 'p1', 'c1', 'club')
    expect(again?.id).toBe(member.id)
    expect(s.clubTrustedHosts).toHaveLength(1)
    expect(s.clubTrustedHosts?.filter((h) => !h.removedAt)).toHaveLength(0)
  })
})
