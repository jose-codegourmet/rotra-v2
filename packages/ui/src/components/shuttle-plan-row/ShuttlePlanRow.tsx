'use client'

import { formatPeso } from '@rotra/schema/money'
import { IconButton } from '@rotra/ui/icon-button'
import { Select } from '@rotra/ui/select'
import { TextInput } from '@rotra/ui/text-input'

export type ShuttlePlanItem = { id: string; name: string; unit: string; unitCostMinor: number; stock: number }
export type ShuttlePlanRowProps = {
  items: ShuttlePlanItem[]
  inventoryItemId: string
  tubes: number | ''
  lineCost: number
  onItemChange: (id: string) => void
  onTubesChange: (tubes: number | '') => void
  onRemove: () => void
  disabled?: boolean
  error?: string
}

export function ShuttlePlanRow({ items, inventoryItemId, tubes, lineCost, onItemChange, onTubesChange, onRemove, disabled, error }: ShuttlePlanRowProps) {
  const item = items.find((i) => i.id === inventoryItemId)
  return <div className="flex min-w-0 flex-col gap-1.5">
    <div className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-2 min-[521px]:grid-cols-[minmax(0,1fr)_84px_auto_auto]">
      <Select className="col-span-full min-[521px]:col-span-1" aria-label="Shuttlecock brand" value={inventoryItemId} disabled={disabled} onChange={onItemChange} options={items.map((i) => ({ value: i.id, label: `${i.name} · ${formatPeso(i.unitCostMinor)}/${i.unit} · ${i.stock} left` }))} />
      <TextInput type="number" min={0} step={1} inputMode="numeric" aria-label={`Tubes of ${item?.name ?? 'shuttlecocks'}`} value={tubes} disabled={disabled} onChange={(event) => onTubesChange(event.target.value === '' ? '' : Number(event.target.value))} invalid={!!error} />
      <span className="text-sm tabular-nums">{item ? formatPeso(lineCost) : '—'}</span>
      <IconButton label="Remove this shuttlecock line" variant="ghost" size="xs" onClick={onRemove} disabled={disabled}>×</IconButton>
    </div>
    {error ? <span role="alert" className="text-xs text-error">{error}</span> : null}
    {item && tubes !== '' && tubes > item.stock ? <span className="text-xs text-warn">Only {item.stock} tubes in stock.</span> : null}
  </div>
}
