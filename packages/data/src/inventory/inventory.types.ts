export type InventoryItem = {
  id: string
  clubId: string
  name: string
  category: 'shuttlecocks' | 'equipment' | 'other'
  unit: string
  stock: number
  unitCostMinor: number
  currency: 'PHP'
  removedAt?: number
  /** Saved data only: the revision an edit must match (real mode). */
  revision?: string
}
