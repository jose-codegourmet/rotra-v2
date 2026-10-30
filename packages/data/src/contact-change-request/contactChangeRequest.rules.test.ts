import { describe, expect, it } from 'vitest'
import {
  createContactChangeRequestFixtures,
  contactRequestFixtureIds as ids,
} from '../fixtures/contactChangeRequests'
import { playerAccounts } from '../fixtures/playerAccounts'
import { JOSE_PLAYER_ID, players } from '../fixtures/players'
import {
  attentionCount,
  type ContactHolder,
  checksFor,
  contactRequestCounts,
  isBlocked,
  matchesContactRequestFilter,
  nextActionLabel,
  normalizeContact,
} from './contactChangeRequest.rules'
import type { PlayerContactChangeRequest } from './contactChangeRequest.types'

// The seeded r1–r9 on real players (fixtures/contactChangeRequests.ts); r2 asks for Jose's number.
const NOW = Date.parse('2026-10-27T10:00:00+08:00')
const requests = createContactChangeRequestFixtures(NOW)
const holders: ContactHolder[] = playerAccounts.flatMap((account) => {
  const player = players.find((entry) => entry.id === account.playerId)
  return player
    ? [{ id: player.id, fullName: player.fullName, rtrId: player.rtrId, ...account }]
    : []
})
const jose = players.find((player) => player.id === JOSE_PLAYER_ID)
if (!jose) throw new Error('fixture missing')
const request = (id: string) => {
  const found = requests.find((entry) => entry.requestId === id)
  if (!found) throw new Error(`missing ${id}`)
  return found
}
const failing = (checks: ReturnType<typeof checksFor>) => checks.filter((check) => !check.ok)

describe('checks before approving (rotra-admin.html checks())', () => {
  it('returns the four checks in ContactChecksList order', () => {
    expect(checksFor(request(ids.r1), holders, requests).map((check) => check.kind)).toEqual([
      'linked-elsewhere',
      'newer-request',
      'original-changed',
      'in-progress',
    ])
  })
  it('r1 passes every check', () => {
    const checks = checksFor(request(ids.r1), holders, requests)
    expect(failing(checks)).toEqual([])
    expect(isBlocked('pending', checks)).toBe(false)
  })
  it('r2 is blocked: the number is linked to another player (Jose), named by name and RTR ID', () => {
    const checks = checksFor(request(ids.r2), holders, requests)
    expect(failing(checks)).toEqual([
      {
        kind: 'linked-elsewhere',
        ok: false,
        otherPlayer: { id: jose.id, fullName: jose.fullName, rtrId: jose.rtrId },
      },
    ])
    expect(isBlocked('pending', checks)).toBe(true)
  })
  it('r3 is blocked by the newer r4, which itself passes', () => {
    expect(failing(checksFor(request(ids.r3), holders, requests))).toEqual([
      {
        kind: 'newer-request',
        ok: false,
        newerRequestId: ids.r4,
        sentAt: request(ids.r4).requestedAt,
      },
    ])
    expect(failing(checksFor(request(ids.r4), holders, requests))).toEqual([])
  })
  it('r5 (entered by the owner) passes; the applied r8 before it is not in the way', () => {
    expect(failing(checksFor(request(ids.r5), holders, requests))).toEqual([])
  })
  it('flags a contact that changed since the request, shown in display form', () => {
    const changed = holders.map((holder) =>
      holder.id === request(ids.r1).playerId ? { ...holder, phone: '+639185550999' } : holder,
    )
    expect(failing(checksFor(request(ids.r1), changed, requests))).toEqual([
      { kind: 'original-changed', ok: false, currentValue: '+63 918 555 0999' },
    ])
  })
  it('flags another change for the same player still being applied', () => {
    const applying: PlayerContactChangeRequest = {
      ...request(ids.r1),
      requestId: 'other',
      field: 'email',
      status: 'applying',
    }
    expect(failing(checksFor(request(ids.r1), holders, [...requests, applying]))).toEqual([
      { kind: 'in-progress', ok: false },
    ])
  })
})

describe('next action (rotra-admin.html nextAction())', () => {
  it.each([
    [ids.r1, 'Review'],
    [ids.r2, 'Review · blocked'],
    [ids.r3, 'Review · blocked'],
    [ids.r6, 'Check status'],
    [ids.r7, 'Retry application'],
    [ids.r8, 'View'],
    [ids.r9, 'View'],
  ])('%s → %s', (id, label) => {
    const entry = request(id)
    const blocked = isBlocked(entry.status, checksFor(entry, holders, requests))
    expect(nextActionLabel(entry.status, blocked)).toBe(label)
  })
  it('only a pending request can be blocked', () => {
    expect(isBlocked('failed', [{ kind: 'in-progress', ok: false }])).toBe(false)
  })
})

describe('counts and filters', () => {
  it('attention = waiting for review + needs attention', () => {
    expect(attentionCount(requests)).toBe(6)
  })
  it('counts every filter over the seed', () => {
    expect(contactRequestCounts(requests)).toEqual({
      pending: 5,
      applying: 1,
      failed: 1,
      applied: 1,
      rejected: 1,
      all: 9,
      attention: 6,
    })
  })
  it("'applying' also holds approved-but-not-applied requests", () => {
    expect(matchesContactRequestFilter('approved', 'applying')).toBe(true)
    expect(matchesContactRequestFilter('approved', 'pending')).toBe(false)
    expect(matchesContactRequestFilter('rejected')).toBe(true)
  })
})

describe('contact normalization', () => {
  it('compares phones as E.164 and emails without case', () => {
    expect(normalizeContact('phone', '+63 917 555 0142')).toBe('+639175550142')
    expect(normalizeContact('phone', '0917 555 0142')).toBe('+639175550142')
    expect(normalizeContact('email', ' Jose@Example.com ')).toBe('jose@example.com')
    expect(normalizeContact('email', undefined)).toBe('')
  })
})
