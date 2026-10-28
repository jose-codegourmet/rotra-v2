import { describe, expect, it } from 'vitest'
import { inventoryItems } from '../fixtures/inventory'
import { amountDuePerHead, defaultShuttlePlan, estimateSessionCost, normalizeSessionCost, paymentTotals } from './sessionCost.rules'
import type { SessionCostInput } from './sessionCost.types'

const input: SessionCostInput = { courtFeePerCourtHour: 35000, entranceFeePerHead: 6000, paymentMode: 'custom', customFeePerHead: 90000, shuttles: [{ inventoryItemId: 'inv1', tubes: 4 }, { inventoryItemId: 'inv2', tubes: 2 }] }
const context = { courts: 3, durationMinutes: 180, players: 14, inventory: inventoryItems }
const empty: SessionCostInput = { courtFeePerCourtHour: null, entranceFeePerHead: null, shuttles: [], paymentMode: 'break_even', customFeePerHead: null }

describe('session cost estimates in centavos', () => {
  it('matches tonight: courts + shuttles + entrance, custom fee and profit', () => {
    expect(estimateSessionCost(input, context)).toEqual({ players: 14, court: 315000, shuttle: 810000, entrance: 84000, entranceFeePerHead: 6000, total: 1209000, breakEven: 86400, perHead: 90000, isCustom: true, collect: 1260000, result: { kind: 'profit', amount: 51000 } })
  })
  it('matches Thursday Open Play with the custom 700 fee', () => {
    expect(estimateSessionCost({ ...input, customFeePerHead: 70000 }, { ...context, players: 18 })).toMatchObject({ total: 1233000, perHead: 70000, collect: 1260000, result: { kind: 'profit', amount: 27000 } })
  })
  it('rounds break-even UP to a whole peso, displaying the surplus', () => {
    expect(estimateSessionCost({ ...input, paymentMode: 'break_even' }, context)).toMatchObject({ breakEven: 86400, perHead: 86400, collect: 1209600, result: { kind: 'breaks_even', amount: 600 } })
  })
  it('shows a custom loss, exact break-even, and zero custom payment', () => {
    expect(estimateSessionCost({ ...input, customFeePerHead: 80000 }, context).result).toEqual({ kind: 'loss', amount: 89000 })
    expect(estimateSessionCost({ ...input, customFeePerHead: 68500 }, { ...context, players: 18 }).result).toEqual({ kind: 'breaks_even', amount: 0 })
    expect(estimateSessionCost({ ...input, customFeePerHead: 0 }, context).result).toEqual({ kind: 'loss', amount: 1209000 })
  })
  it('uses at least one player and handles no costs', () => {
    expect(estimateSessionCost(empty, { ...context, players: 0 })).toMatchObject({ players: 1, total: 0, perHead: 0, result: { kind: 'no_costs', amount: 0 } })
    expect(amountDuePerHead(null)).toBeNull()
    expect(amountDuePerHead(estimateSessionCost(empty, context))).toBe(0)
  })
  it('uses current prices and allows more tubes than stock', () => {
    const estimate = estimateSessionCost({ ...empty, shuttles: [{ inventoryItemId: 'inv3', tubes: 10 }] }, context)
    expect(estimate.shuttle).toBe(1250000)
    expect(estimateSessionCost(input, { ...context, inventory: inventoryItems.map((i) => i.id === 'inv1' ? { ...i, unitCostMinor: 150000 } : i) }).total).toBe(1229000)
    expect(inventoryItems[2]?.stock).toBe(2)
  })
  it('rounds fractional court costs to the nearest centavo, including half-centavos', () => {
    expect(estimateSessionCost({ ...empty, courtFeePerCourtHour: 100 }, { ...context, courts: 1, durationMinutes: 1 }).court).toBe(2)
    expect(estimateSessionCost({ ...empty, courtFeePerCourtHour: 101 }, { ...context, courts: 1, durationMinutes: 30 }).court).toBe(51)
  })
  it('suggests the first shuttlecock item, rounded and at least one tube', () => {
    expect(defaultShuttlePlan(context)).toEqual([{ inventoryItemId: 'inv1', tubes: 6 }])
    expect(defaultShuttlePlan({ ...context, courts: 1, durationMinutes: 30 })).toEqual([{ inventoryItemId: 'inv1', tubes: 1 }])
    expect(defaultShuttlePlan({ ...context, inventory: inventoryItems.filter((i) => i.category !== 'shuttlecocks') })).toEqual([])
  })
  it('drops empty and zero-tube lines and saves no estimate for untouched optional fields', () => {
    expect(normalizeSessionCost(empty)).toBeNull()
    const saved = normalizeSessionCost({ ...input, notes: 'Private setup notes' } as SessionCostInput)
    expect(saved).not.toHaveProperty('notes')
    expect(normalizeSessionCost({ ...empty, shuttles: [{ inventoryItemId: '', tubes: 2 }, { inventoryItemId: 'inv1', tubes: 0 }] })).toBeNull()
    expect(normalizeSessionCost({ ...empty, courtFeePerCourtHour: 0 })?.courtFeePerCourtHour).toBe(0)
    expect(normalizeSessionCost({ ...input, paymentMode: 'break_even' })?.customFeePerHead).toBeNull()
  })
})
describe('payment totals', () => {
  it('uses the ticked amounts while calculating remaining dues at the current fee', () => {
    expect(paymentTotals({ marks: [{ amountMinor: 70000 }, { amountMinor: 65000 }], total: 3, amountDue: 70000, cost: 200000 })).toEqual({ paid: 2, total: 3, collected: 135000, stillDue: 70000, againstCosts: -65000, cost: 200000 })
  })
  it('keeps no-fee and no-estimate totals unknown', () => {
    expect(paymentTotals({ marks: [], total: 3, amountDue: null, cost: null })).toEqual({ paid: 0, total: 3, collected: 0, stillDue: null, againstCosts: null, cost: null })
  })
  it('handles all paid and a collection surplus', () => {
    expect(paymentTotals({ marks: [{ amountMinor: 70000 }], total: 1, amountDue: 70000, cost: 65000 })).toMatchObject({ stillDue: 0, againstCosts: 5000 })
  })
})
