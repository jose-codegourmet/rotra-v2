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
  inventory: Pick<InventoryItem, 'id' | 'name' | 'unit' | 'unitCostMinor' | 'stock'>[]
}
export type SessionCostResult = {
  players: number
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
