import type { SessionCostEstimate } from '../session-cost/sessionCost.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import portraits from './playerPortraits.json'
import { clubPlayers } from './players'

const pictures: Record<string, string> = portraits

/** Prototype financePanel and histFinancePane values, in integer centavos. */
export const thursdayEstimate = {
  players: 18,
  court: 315000,
  shuttle: 810000,
  entrance: 108000,
  entranceFeePerHead: 6000,
  total: 1233000,
  breakEven: 68500,
  perHead: 70000,
  isCustom: true,
  collect: 1260000,
  result: { kind: 'profit' as const, amount: 27000 },
}
export const financialEstimateVariants = {
  profit: thursdayEstimate,
  loss: {
    ...thursdayEstimate,
    perHead: 60000,
    collect: 1080000,
    result: { kind: 'loss' as const, amount: 153000 },
  },
  breaksEven: {
    ...thursdayEstimate,
    perHead: 68500,
    collect: 1233000,
    isCustom: false,
    result: { kind: 'breaks_even' as const, amount: 0 },
  },
  roundingSurplus: {
    ...thursdayEstimate,
    players: 17,
    entrance: 102000,
    total: 1227000,
    breakEven: 72200,
    perHead: 72200,
    collect: 1227400,
    isCustom: false,
    result: { kind: 'breaks_even' as const, amount: 400 },
  },
  noCosts: {
    players: 18,
    court: 0,
    shuttle: 0,
    total: 0,
    breakEven: 0,
    perHead: 0,
    collect: 0,
    isCustom: false,
    result: { kind: 'no_costs' as const, amount: 0 },
  },
}
export const shuttlePlanItems = [
  { id: 'inv1', name: 'XP2', unit: 'tube', unitCostMinor: 98000, stock: 12 },
  { id: 'inv2', name: 'XP2 Used', unit: 'tube', unitCostMinor: 0, stock: 2 },
]
export const longShuttlePlanItems = [
  { ...shuttlePlanItems[0]!, name: 'XP2 Tournament Feather Shuttlecocks, Tube of 12' },
]
export const financialShuttleLines = [
  { id: 'inv1', name: 'XP2', tubes: 4 },
  { id: 'inv2', name: 'XP2 Used', tubes: 2 },
]
export const sundayEstimate = {
  players: 16,
  court: 315000,
  shuttle: 392000,
  total: 707000,
  breakEven: 44200,
  perHead: 44200,
  collect: 707200,
  isCustom: false,
  result: { kind: 'breaks_even' as const, amount: 200 },
}

export const paymentPlayers = clubPlayers
  .slice(0, 18)
  .map((p, index) => ({
    clubPlayerId: p.id,
    name: p.fullName,
    picture: p.playerId ? pictures[p.playerId] : undefined,
    paid: index < 15 ? { amount: 70000, at: Date.UTC(2026, 9, 22, 11, 42) } : undefined,
  }))
  .sort((a, b) => Number(!!a.paid) - Number(!!b.paid) || a.name.localeCompare(b.name))
export const allPaymentPlayers = paymentPlayers.map((p) => ({
  ...p,
  paid: p.paid ?? { amount: 70000, at: Date.UTC(2026, 9, 22, 11, 42) },
}))
export const unpaidPaymentPlayers = paymentPlayers.map((p) => ({ ...p, paid: undefined }))
export const paymentTotalsFixture = {
  paid: 15,
  total: 18,
  collected: 1050000,
  stillDue: 210000,
  againstCosts: 235000,
  cost: 815000,
}

export function createFinancialFixtures(roster: SessionPlayer[], now = Date.now()) {
  const base = {
    courtFeePerCourtHour: 35000,
    entranceFeePerHead: 6000,
    paymentMode: 'custom' as const,
    customFeePerHead: 70000,
    shuttles: [
      { inventoryItemId: 'inv1', tubes: 4 },
      { inventoryItemId: 'inv2', tubes: 2 },
    ],
    currency: 'PHP' as const,
  }
  const costEstimates: Record<string, SessionCostEstimate> = {
    's-tonight': { ...base, sessionId: 's-tonight', customFeePerHead: 90000 },
    h1: { ...base, sessionId: 'h1' },
    h2: {
      ...base,
      sessionId: 'h2',
      entranceFeePerHead: null,
      paymentMode: 'break_even',
      customFeePerHead: null,
      shuttles: [
        { inventoryItemId: 'inv1', tubes: 3 },
        { inventoryItemId: 'inv2', tubes: 2 },
      ],
    },
  }
  const paymentMarks = roster
    .filter((p) => p.sessionId === 'h1')
    .slice(0, -3)
    .map((p) => ({
      sessionId: 'h1',
      sessionPlayerId: p.id,
      amountMinor: 70000,
      markedAt: now - 3 * 86400000,
      currency: 'PHP' as const,
    }))
  return { costEstimates, paymentMarks }
}
