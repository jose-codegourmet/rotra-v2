import { describe, expect, it } from 'vitest'
import { buildPaymentShare, paymentShareEntry } from './paymentShare.rules'

const rows = [
  { name: 'Maya Cruz', receivedMinor: 70000 },
  { name: 'Ben Lim', receivedMinor: 50000 },
  { name: 'Carl Tan', receivedMinor: null },
  { name: 'Dina Ong', receivedMinor: 80000 },
]

describe('payment status share (#1010)', () => {
  it('groups by the session-payment status and numbers each list', () => {
    const { text, counts } = buildPaymentShare({
      heading: 'Thursday Open Play',
      amountDue: 70000,
      rows,
      filter: 'all',
    })
    expect(counts).toEqual({ all: 4, paid: 2, partial: 1, unpaid: 1 })
    expect(text).toBe(
      [
        'Payment status · Thursday Open Play',
        '₱700 per player',
        '',
        'PAID (2)',
        '1. Maya Cruz · paid ₱700 · balance ₱0',
        '2. Dina Ong · paid ₱800 · balance ₱0 · ₱100 to return',
        '',
        'PARTIAL (1)',
        '1. Ben Lim · paid ₱500 · balance ₱200',
        '',
        'UNPAID (1)',
        '1. Carl Tan · balance ₱700',
        '',
        'Collected: ₱2,000 · Balance: ₱900',
      ].join('\n'),
    )
  })
  it('a filter shows one status with totals for those people only', () => {
    const { text, totals } = buildPaymentShare({
      heading: 'Night',
      amountDue: 70000,
      rows,
      filter: 'partial',
    })
    expect(text).toContain('PARTIAL (1)')
    expect(text).not.toContain('PAID')
    expect(text).not.toContain('UNPAID')
    expect(totals).toEqual({ count: 1, collectedMinor: 50000, balanceMinor: 20000 })
  })
  it('an empty status reads None', () => {
    const { text } = buildPaymentShare({
      heading: 'Night',
      amountDue: 70000,
      rows: [{ name: 'Maya Cruz', receivedMinor: 70000 }],
      filter: 'unpaid',
    })
    expect(text).toContain('UNPAID (0)\nNone')
    expect(text).toContain('Collected: ₱0 · Balance: ₱0')
  })
  it('never counts a waived amount as collected cash', () => {
    const waived = paymentShareEntry(
      { name: 'Recipient', receivedMinor: 0, waivedMinor: 70000 },
      70000,
    )
    expect(waived).toMatchObject({ group: 'paid', receivedMinor: 0, balanceMinor: 0 })
    const part = paymentShareEntry(
      { name: 'Transferred', receivedMinor: 50000, waivedMinor: 20000 },
      70000,
    )
    expect(part).toMatchObject({ group: 'paid', receivedMinor: 50000, balanceMinor: 0 })
    const { text, totals } = buildPaymentShare({
      heading: 'Night',
      amountDue: 70000,
      rows: [
        { name: 'Transferred', receivedMinor: 50000, waivedMinor: 20000 },
        { name: 'Recipient', receivedMinor: 0, waivedMinor: 70000 },
      ],
      filter: 'all',
    })
    expect(totals.collectedMinor).toBe(50000)
    expect(text).toContain('1. Transferred · paid ₱500 · balance ₱0 · ₱200 waived')
    expect(text).toContain('Collected: ₱500 · Balance: ₱0')
  })
  it('a partial waiver lowers the balance but keeps the person Partial', () => {
    expect(
      paymentShareEntry({ name: 'A', receivedMinor: 20000, waivedMinor: 20000 }, 70000),
    ).toMatchObject({ group: 'partial', balanceMinor: 30000 })
  })
  it('with no fee set any payment is paid and no balance is shown', () => {
    const { text } = buildPaymentShare({
      heading: 'Night',
      amountDue: null,
      rows: [
        { name: 'A', receivedMinor: 30000 },
        { name: 'B', receivedMinor: null },
      ],
      filter: 'all',
    })
    expect(text).toContain('No fee set for this session.')
    expect(text).toContain('1. A · paid ₱300')
    expect(text).toContain('1. B')
    expect(text).toContain('Collected: ₱300')
    expect(text).not.toContain('Balance')
  })
})
