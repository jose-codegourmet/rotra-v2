'use client'

import type { InventoryItem } from '@rotra/data/inventory/types'
import { useSaveInventoryItem } from '@rotra/data/inventory/useSaveInventoryItem'
import { InventoryItemForm } from '@rotra/ui/forms/inventory-item-form'
import { Sheet } from '@rotra/ui/sheet'
import { toast } from '@rotra/ui/toaster'

export type InventoryItemSheetProps = { item?: InventoryItem; onClose: () => void }
export function InventoryItemSheet({ item, onClose }: InventoryItemSheetProps) {
  const save = useSaveInventoryItem()
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose()
      }}
      title={item ? 'Edit item' : 'Add item'}
      dismissible={!save.isPending}
    >
      <InventoryItemForm
        mode={item ? 'edit' : 'add'}
        defaultValues={
          item
            ? {
                name: item.name,
                category: item.category,
                unit: item.unit,
                stock: String(item.stock),
                unitCostMinor: String(item.unitCostMinor / 100),
              }
            : undefined
        }
        isPending={save.isPending}
        serverError={save.error?.message}
        onCancel={onClose}
        onSubmit={(values) =>
          save.mutate(
            { ...values, id: item?.id },
            {
              onSuccess: (result) => {
                toast(result.message)
                onClose()
              },
              onError: (error) => toast.error(error.message),
            },
          )
        }
      />
    </Sheet>
  )
}
