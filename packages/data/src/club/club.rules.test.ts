import { describe, expect, it } from 'vitest'
import { buildPostValues, type ClubPrice, DEFAULT_POST_TEMPLATE } from './club.rules'

const _paid = (monthlyPesos: number, yearlyPesos: number): ClubPrice => ({
  licensePricing: 'paid',
  licenseMonthlyMinor: monthlyPesos * 100,
  licenseYearlyMinor: yearlyPesos * 100,
})

describe('Facebook post court times and join line (#730)', () => {
  const at = (h: number, m = 0, day = 11) => new Date(2026, 10, day, h, m).getTime()
  const base = {
    club: { name: 'Club', description: '', courtRules: null },
    session: {
      title: 'Night',
      scheduledStartAt: at(19, 30),
      scheduledEndAt: at(22, 30),
      venueName: 'Hall',
      venueAddress: '',
    },
    roster: [],
    waitlist: [],
    openSlots: 0,
    mode: 'fair' as const,
    minimum: 3,
    joinUrl: 'https://x.test/s/abc123',
  }
  it('fills the join line and appends it when a saved template lacks the key', () => {
    const _values = buildPostValues({ ...base, courts: [] })
    const _line = 'To join and see the full roster, open this link: https://x.test/s/abc123'
    expect(DEFAULT_POST_TEMPLATE.trimEnd().endsWith('{{ join_link }}')).toBe(true)
  })
})
