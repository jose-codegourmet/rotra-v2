'use client'
import type { AdminPlayerListParams } from '@rotra/data/admin-player/types'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Icon } from '@rotra/ui/icon'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Select } from '@rotra/ui/select'
import { Switch } from '@rotra/ui/switch'
import { TextInput } from '@rotra/ui/text-input'
import { useId, useState } from 'react'

export type AdminPlayerFiltersProps = {
  filters: AdminPlayerListParams
  places: { code: string; name: string }[]
  onChange: (patch: Partial<AdminPlayerListParams>) => void
  onClear: () => void
  defaultOpen?: boolean
  view?: 'list' | 'grid'
  onViewChange?: (view: 'list' | 'grid') => void
}
export function AdminPlayerFilters({
  filters: f,
  places,
  onChange,
  onClear,
  defaultOpen = false,
  view,
  onViewChange,
}: AdminPlayerFiltersProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [localView, setLocalView] = useState<'list' | 'grid'>('list')
  const panelId = useId()
  return (
    <section aria-label="Player filters" className="mb-2.5 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <TextInput
          type="search"
          aria-label="Search players"
          placeholder="Search by name, RTR ID, phone or email"
          value={f.q ?? ''}
          onChange={(e) => onChange({ q: e.target.value })}
          className="min-w-0 flex-[1_1_240px]"
        />
        <SegmentedControl
          aria-label="Filter by account"
          value={f.account ?? 'all'}
          options={[
            { value: 'all', label: 'All' },
            { value: 'registered', label: 'Registered' },
            { value: 'unclaimed', label: 'Unclaimed' },
          ]}
          onChange={(account) => onChange({ account: account as AdminPlayerListParams['account'] })}
        />
        <Button aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filters
        </Button>
        <SegmentedControl
          aria-label="Layout"
          value={view ?? localView}
          options={[
            {
              value: 'list',
              label: <Icon name="list" size={16} />,
              iconOnly: true,
              ariaLabel: 'List view',
            },
            {
              value: 'grid',
              label: <Icon name="grid" size={16} />,
              iconOnly: true,
              ariaLabel: 'Grid view',
            },
          ]}
          onChange={(next) => {
            const layout = next as 'list' | 'grid'
            setLocalView(layout)
            onViewChange?.(layout)
          }}
        />
      </div>
      {open ? (
        <section
          id={panelId}
          aria-label="More filters"
          className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-4 shadow-card"
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-3">
            <Field label="Added from">
              <TextInput
                type="date"
                value={f.addedFrom ?? ''}
                onChange={(e) => onChange({ addedFrom: e.target.value })}
              />
            </Field>
            <Field label="Added to">
              <TextInput
                type="date"
                min={f.addedFrom}
                value={f.addedTo ?? ''}
                onChange={(e) => onChange({ addedTo: e.target.value })}
              />
            </Field>
            <Field label="Place registered">
              <Select
                value={f.place?.[0] ?? 'all'}
                options={[
                  { value: 'all', label: 'All places' },
                  ...places.map((p) => ({ value: p.code, label: p.name })),
                ]}
                onChange={(place) => onChange({ place: place === 'all' ? undefined : [place] })}
              />
            </Field>
            <Field label="Archive status">
              <Select
                value={f.archived ?? 'active'}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'archived', label: 'Archived' },
                  { value: 'all', label: 'All' },
                ]}
                onChange={(archived) =>
                  onChange({ archived: archived as AdminPlayerListParams['archived'] })
                }
              />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-3.5 rounded-lg border border-border px-3.5 py-3">
            <div className="flex flex-col gap-1">
              <b>Duplicates only</b>
              <span className="text-sm text-fg2">
                Duplicate matches share a normalized name, phone or email. Flag only; never merge.
              </span>
            </div>
            <Switch
              aria-label="Duplicates only"
              checked={f.duplicates ?? false}
              onChange={(duplicates) => onChange({ duplicates })}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={onClear}>Clear filters</Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </section>
      ) : null}
    </section>
  )
}
