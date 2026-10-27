'use client'

import type { ClubVenue } from '@rotra/data/club-venue/types'
import { formatPeso } from '@rotra/schema/money'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Field } from '@rotra/ui/field'
import { Icon } from '@rotra/ui/icon'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { useState } from 'react'

export type PickerVenue = Pick<
  ClubVenue,
  'id' | 'name' | 'address' | 'courtFeeMinor' | 'entranceFeeMinor'
>

export type VenuePickerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  venues: PickerVenue[]
  selectedVenueId: string | null
  onPick: (venueId: string) => void
  onEdit: (venueId: string) => void
  /** Opens the New venue form, with the typed name when the search has one */
  onAddNew: (prefillName: string) => void
}

const feeLine = (v: PickerVenue) =>
  `${v.address || 'No address'} · ${v.courtFeeMinor != null ? `${formatPeso(v.courtFeeMinor)}/h per court` : 'No court fee set'}${v.entranceFeeMinor != null ? ` · ${formatPeso(v.entranceFeeMinor)} entrance` : ''}`

const optionClass =
  'flex w-full min-w-0 items-center gap-2.5 rounded-md border border-border-strong bg-bg px-3 py-2.5 text-left text-fg hover:bg-elev aria-pressed:border-accent aria-pressed:bg-accent-subtle'

/** Choose a venue: search, pick one of the club's venues, edit it, or add a new one. */
export function VenuePickerSheet({
  open,
  onOpenChange,
  venues,
  selectedVenueId,
  onPick,
  onEdit,
  onAddNew,
}: VenuePickerSheetProps) {
  const [query, setQuery] = useState('')
  const q = query.trim()
  const ql = q.toLowerCase()
  const list = venues.filter(
    (v) => !ql || v.name.toLowerCase().includes(ql) || v.address.toLowerCase().includes(ql),
  )
  const exact = venues.some((v) => v.name.toLowerCase() === ql)
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Choose a venue"
      footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
    >
      <Field label="Search your venues">
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Venue name or area"
          autoComplete="off"
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        {list.map((v) => (
          <div key={v.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPick(v.id)}
              aria-pressed={selectedVenueId === v.id}
              className={cn(optionClass, 'flex-1')}
            >
              <span className="grid size-8 flex-none place-items-center rounded-lg bg-accent-subtle text-accent">
                <Icon name="pin" />
              </span>
              <span className="flex min-w-0 flex-col">
                <b className="[overflow-wrap:anywhere]">{v.name}</b>
                <span className="text-[13px] text-fg2">{feeLine(v)}</span>
              </span>
            </button>
            <Button
              size="xs"
              variant="ghost"
              aria-label={`Edit ${v.name}`}
              onClick={() => onEdit(v.id)}
            >
              Edit
            </Button>
          </div>
        ))}
        {q && !exact ? (
          <button type="button" onClick={() => onAddNew(q)} className={optionClass}>
            + Add “{q}” as a new venue
          </button>
        ) : null}
        {!list.length && !q ? (
          <div className="px-3 py-6 text-center text-sm text-fg2">No saved venues yet.</div>
        ) : null}
        {!q ? (
          <button type="button" onClick={() => onAddNew('')} className={optionClass}>
            + Add a new venue
          </button>
        ) : null}
      </div>
    </Sheet>
  )
}
