import type { InventoryItem } from '../inventory/inventory.types'

export type SessionShuttlePlanLine = { inventoryItemId: string; tubes: number }
export type SessionCostInput = {
  courtFeePerCourtHour: number | null
  entranceFeePerHead: number | null
  shuttles: SessionShuttlePlanLine[]
  paymentMode: 'break_even' | 'custom'
  customFeePerHead: number | null
}
export type SessionCostEstimate = SessionCostInput & { sessionId: string; currency: 'PHP' }
export type SessionCostContext = {
  courts: number
  durationMinutes: number
  players: number
  /**
   * Free players (D-2026-11-27-01): roster players marked free owe nothing and leave the head count
   * of the break-even share; the entrance fee still counts every player. Default 0.
   */
  freePlayers?: number
  inventory: Pick<InventoryItem, 'id' | 'name' | 'unit' | 'unitCostMinor' | 'stock'>[]
}
export type SessionCostResult = {
  players: number
  /** Players who pay: `players` less the free players, at least 1 (D-2026-11-27-01) */
  payers?: number
  court: number
  shuttle: number
  entrance: number
  entranceFeePerHead: number
  total: number
  breakEven: number
  perHead: number
  isCustom: boolean
  collect: number
  result: { kind: 'profit' | 'loss' | 'breaks_even' | 'no_costs'; amount: number }
}
