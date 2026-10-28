import { clubPlayers, players } from './players'

/** Prototype financePanel and histFinancePane values, in integer centavos. */
export const thursdayEstimate = {
  players: 18, court: 315000, shuttle: 810000, entrance: 108000,
  entranceFeePerHead: 6000, total: 1233000, breakEven: 68500,
  perHead: 70000, isCustom: true, collect: 1260000,
  result: { kind: 'profit' as const, amount: 27000 },
}
export const financialEstimateVariants = {
  profit: thursdayEstimate,
  loss: { ...thursdayEstimate, perHead: 60000, collect: 1080000, result: { kind: 'loss' as const, amount: 153000 } },
  breaksEven: { ...thursdayEstimate, perHead: 68500, collect: 1233000, isCustom: false, result: { kind: 'breaks_even' as const, amount: 0 } },
  roundingSurplus: { ...thursdayEstimate, players: 17, entrance: 102000, total: 1227000, breakEven: 72200, perHead: 72200, collect: 1227400, isCustom: false, result: { kind: 'breaks_even' as const, amount: 400 } },
  noCosts: { players: 18, court: 0, shuttle: 0, total: 0, breakEven: 0, perHead: 0, collect: 0, isCustom: false, result: { kind: 'no_costs' as const, amount: 0 } },
}
export const shuttlePlanItems = [
  { id: 'inv1', name: 'Yonex Aerosensa 30', unit: 'tube', unitCostMinor: 145000, stock: 12 },
  { id: 'inv2', name: 'RSL Classic', unit: 'tube', unitCostMinor: 115000, stock: 6 },
  { id: 'inv3', name: 'Victor Master No. 3', unit: 'tube', unitCostMinor: 125000, stock: 2 },
]
export const longShuttlePlanItems = [{ ...shuttlePlanItems[0]!, name: 'Yonex Aerosensa 30 Tournament Feather Shuttlecocks' }]
export const financialShuttleLines = [{ id: 'inv1', name: 'Yonex Aerosensa 30', tubes: 4 }, { id: 'inv2', name: 'RSL Classic', tubes: 2 }]
export const sundayEstimate = { players: 16, court: 315000, shuttle: 575000, total: 890000, breakEven: 55700, perHead: 55700, collect: 891200, isCustom: false, result: { kind: 'breaks_even' as const, amount: 1200 } }

export const paymentPlayers = clubPlayers.slice(0, 18).map((p, index) => ({
 clubPlayerId: p.id, name: p.fullName,
 picture: players.find((x) => x.id === p.playerId)?.pictureUrl,
 paid: index < 15 ? { amount: 70000, at: Date.UTC(2026, 9, 22, 11, 42) } : undefined,
})).sort((a, b) => Number(!!a.paid) - Number(!!b.paid) || a.name.localeCompare(b.name))
export const allPaymentPlayers = paymentPlayers.map((p) => ({ ...p, paid: p.paid ?? { amount: 70000, at: Date.UTC(2026, 9, 22, 11, 42) } }))
export const unpaidPaymentPlayers = paymentPlayers.map((p) => ({ ...p, paid: undefined }))
export const paymentTotalsFixture = { paid: 15, total: 18, collected: 1050000, stillDue: 210000, againstCosts: -183000, cost: 1233000 }
