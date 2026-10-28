'use client'

import { useInventory } from '@rotra/data/inventory/useInventory'
import { useRemoveInventoryItem } from '@rotra/data/inventory/useRemoveInventoryItem'
import { useStepInventoryStock } from '@rotra/data/inventory/useStepInventoryStock'
import { InventoryScreen } from '@rotra/ui/inventory-screen'
import { InventorySection } from '@rotra/ui/inventory-section'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { QueryError } from '../../../_components/query-error/QueryError'
import { InventoryItemSheet } from '../inventory-item-sheet/InventoryItemSheet'

export function Inventory({ fromSetup }: { fromSetup: boolean }) {
  const router = useRouter()
  const inventory = useInventory(), remove = useRemoveInventoryItem(), step = useStepInventoryStock()
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const items = inventory.data?.items ?? []
  const callbacks = { onSuccess: (result: { message: string }) => toast(result.message), onError: (error: Error) => toast.error(error.message) }
  return <InventoryScreen count={items.length} stockValue={inventory.data?.stockValue ?? 0} fromSetup={fromSetup} onBack={() => {
    if (fromSetup) {
      let target = '/sessions/new'
      try { const saved = sessionStorage.getItem('rotra-setup-return'); if (saved && /^\/sessions\/(new|[^/]+\/edit)$/.test(saved)) target = saved } catch {}
      router.push(target)
    } else router.push('/')
  }} onAdd={() => setEditing('new')}>
    {inventory.isError ? <QueryError query={inventory} title="Couldn't load your inventory." /> : inventory.isPending ? <Skeleton className="h-64 rounded-lg" /> : (['shuttlecocks', 'equipment', 'other'] as const).map((category) => <InventorySection key={category} category={category} items={items.filter((i) => i.category === category)} disabled={remove.isPending || step.isPending} onEdit={setEditing} onRemove={(id) => remove.mutate(id, callbacks)} onStep={(id, delta) => step.mutate({ id, delta }, callbacks)} />)}
    {editing ? <InventoryItemSheet item={items.find((i) => i.id === editing)} onClose={() => setEditing(null)} /> : null}
  </InventoryScreen>
}
