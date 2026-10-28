'use client'

import { formatPeso } from '@rotra/schema/money'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Button } from '@rotra/ui/button'
import { PageHeader } from '@rotra/ui/page-header'
import type { ReactNode } from 'react'

export type InventoryScreenProps = {
  count: number
  stockValue: number
  fromSetup?: boolean
  onBack: () => void
  onAdd: () => void
  children: ReactNode
}
/** Q-INVENTORY's wrap/header/footer; data and sheet composition stay in the container. */
export function InventoryScreen({
  count,
  stockValue,
  fromSetup,
  onBack,
  onAdd,
  children,
}: InventoryScreenProps) {
  return (
    <main className="mx-auto flex max-w-[860px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
      <Breadcrumb label={fromSetup ? 'Back to session setup' : 'Home'} onClick={onBack} />
      <PageHeader
        title="Inventory"
        description={`${count} items · stock worth ${formatPeso(stockValue)}`}
        actions={
          <Button size="sm" variant="primary" onClick={onAdd}>
            Add item
          </Button>
        }
      />
      {children}
      <p className="m-0 text-sm text-fg2">
        Shuttlecock prices here fill in the session cost estimate. Stock isn't deducted
        automatically yet; adjust it with − and + after a session.
      </p>
    </main>
  )
}
