'use client'

import type { InventoryItem } from '@rotra/data/inventory/types'
import { Card } from '@rotra/ui/card'
import { InventoryItemCard } from '@rotra/ui/inventory-item-card'

export type InventorySectionProps = {
  category: InventoryItem['category']
  items: InventoryItem[]
  onStep: (id: string, delta: -1 | 1) => void
  onRemove: (id: string) => void
  onEdit: (id: string) => void
  disabled?: boolean
}
const CATEGORY_NAMES = { shuttlecocks: 'Shuttlecocks', equipment: 'Equipment', other: 'Other' }
export function InventorySection({ category, items, onStep, onRemove, onEdit, disabled }: InventorySectionProps) {
  return <section className="flex flex-col gap-3"><h2 className="m-0 text-lg font-bold">{CATEGORY_NAMES[category]}</h2>
    {items.length ? <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-3">{items.map((item) => <InventoryItemCard key={item.id} item={item} onStep={(delta) => onStep(item.id, delta)} onRemove={() => onRemove(item.id)} onEdit={() => onEdit(item.id)} disabled={disabled} />)}</div> : <Card className="py-8 text-center text-sm text-fg2">No {category} yet.</Card>}
  </section>
}
