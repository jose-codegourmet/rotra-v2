import type { InventoryItem } from '../inventory/inventory.types'
import { clubs } from './clubs'

export const inventoryItems: InventoryItem[] = [
  {
    id: 'inv1',
    name: 'XP2',
    category: 'shuttlecocks',
    unit: 'tube',
    stock: 12,
    unitCostMinor: 98000,
  },
  {
    id: 'inv2',
    name: 'XP2 Used',
    category: 'shuttlecocks',
    unit: 'tube',
    stock: 2,
    unitCostMinor: 0,
  },
  {
    id: 'inv4',
    name: 'Overgrip tape',
    category: 'equipment',
    unit: 'piece',
    stock: 24,
    unitCostMinor: 8000,
  },
  {
    id: 'inv5',
    name: 'Loaner racket',
    category: 'equipment',
    unit: 'piece',
    stock: 4,
    unitCostMinor: 0,
  },
  {
    id: 'inv6',
    name: 'Bottled water',
    category: 'other',
    unit: 'case',
    stock: 3,
    unitCostMinor: 24000,
  },
].map((item) => ({
  ...item,
  category: item.category as InventoryItem['category'],
  clubId: clubs[0]!.id,
  currency: 'PHP' as const,
}))
