import { describe, expect, it } from 'vitest'
import { paymentStatus, paymentTotals, receivedAmount } from './sessionPayment.rules'

describe('payment status (#479)', () => {
  const due = 70000
  it('compares the amount received with the current amount due', () => {
    expect(paymentStatus(undefined, due)).toEqual({ kind: 'unpaid' })
    expect(paymentStatus({ amountMinor: 0 }, due)).toEqual({ kind: 'unpaid' })
    expect(paymentStatus({ amountMinor: 70000 }, due)).toEqual({ kind: 'paid' })
    expect(paymentStatus({ amountMinor: 50000 }, due)).toEqual({ kind: 'partial', left: 20000 })
    expect(paymentStatus({ amountMinor: 80000 }, due)).toEqual({
      kind: 'reimburse',
      toReturn: 10000,
    })
  })
  it('re-derives after a price change without touching the amount received', () => {
    const mark = { amountMinor: 59700 }
    expect(paymentStatus(mark, 55000)).toEqual({ kind: 'reimburse', toReturn: 4700 })
    expect(paymentStatus(mark, 65000)).toEqual({ kind: 'partial', left: 5300 })
    expect(mark.amountMinor).toBe(59700)
  })
  it('counts a legacy mark with no amount as paid at the current due', () => {
    expect(receivedAmount({ amountMinor: null }, due)).toBe(70000)
    expect(paymentStatus({ amountMinor: null }, due)).toEqual({ kind: 'paid' })
  })
  it('treats any mark as paid when no fee is set', () => {
    expect(paymentStatus({ amountMinor: 30000 }, null)).toEqual({ kind: 'paid' })
    expect(paymentStatus(undefined, null)).toEqual({ kind: 'unpaid' })
  })
})
describe('payment totals', () => {
  it('uses the received amounts while calculating remaining dues at the current fee', () => {
    expect(
      paymentTotals({
        marks: [{ amountMinor: 70000 }, { amountMinor: 65000 }],
        total: 3,
        amountDue: 70000,
        cost: 200000,
      }),
    ).toEqual({
      paid: 1,
      partial: 1,
      total: 3,
      collected: 135000,
      stillDue: 75000,
      toReimburse: 0,
      againstCosts: -65000,
      cost: 200000,
    })
  })
  it('counts overpayments as paid and totals what to reimburse', () => {
    expect(
      paymentTotals({
        marks: [{ amountMinor: 80000 }, { amountMinor: null }],
        total: 2,
        amountDue: 70000,
        cost: null,
      }),
    ).toMatchObject({ paid: 2, partial: 0, collected: 150000, stillDue: 0, toReimburse: 10000 })
  })
  it('keeps no-fee and no-estimate totals unknown', () => {
    expect(paymentTotals({ marks: [], total: 3, amountDue: null, cost: null })).toEqual({
      paid: 0,
      partial: 0,
      total: 3,
      collected: 0,
      stillDue: null,
      toReimburse: 0,
      againstCosts: null,
      cost: null,
    })
  })
  it('handles all paid and a collection surplus', () => {
    expect(
      paymentTotals({ marks: [{ amountMinor: 70000 }], total: 1, amountDue: 70000, cost: 65000 }),
    ).toMatchObject({ stillDue: 0, againstCosts: 5000 })
  })
})
