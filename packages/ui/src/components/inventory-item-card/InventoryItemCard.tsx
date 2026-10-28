'use client'

import type { InventoryItem } from '@rotra/data/inventory/types'
import { formatPeso } from '@rotra/schema/money'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { IconButton } from '@rotra/ui/icon-button'

export type InventoryItemCardProps = {
  item: InventoryItem
  onStep: (delta: -1 | 1) => void
  onRemove: () => void
  onEdit: () => void
  disabled?: boolean
}
export function InventoryItemCard({
  item,
  onStep,
  onRemove,
  onEdit,
  disabled,
}: InventoryItemCardProps) {
  const low = item.stock <= 2
  return (
    <article
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-lg border border-border-strong bg-surface p-3',
        low && 'border-warn',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <b className="min-w-0 break-words">{item.name}</b>
        <IconButton
          label={`Remove ${item.name}`}
          size="xs"
          variant="ghost"
          onClick={onRemove}
          disabled={disabled}
        >
          ×
        </IconButton>
      </div>
      <span className="text-sm text-fg2">
        {item.unitCostMinor ? `${formatPeso(item.unitCostMinor)} per ${item.unit}` : 'No cost'}
      </span>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <IconButton
            label={`One less ${item.unit} of ${item.name}`}
            size="xs"
            disabled={disabled || item.stock === 0}
            onClick={() => onStep(-1)}
          >
            −
          </IconButton>
          <b className="min-w-8 text-center text-xl tabular-nums">{item.stock}</b>
          <IconButton
            label={`One more ${item.unit} of ${item.name}`}
            size="xs"
            disabled={disabled}
            onClick={() => onStep(1)}
          >
            +
          </IconButton>
        </div>
        <span className="text-xs text-fg2">{item.unit}s in stock</span>
      </div>
      {low ? <span className="text-sm text-warn">Running low</span> : null}
      <Button size="xs" onClick={onEdit} disabled={disabled}>
        Edit
      </Button>
    </article>
  )
}
