'use client'
import type { AdminPlayerListParams } from '@rotra/data/admin-player/types'
import { Button } from '@rotra/ui/button'
import { Checkbox } from '@rotra/ui/checkbox'
import { Field } from '@rotra/ui/field'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Select } from '@rotra/ui/select'
import { TextInput } from '@rotra/ui/text-input'
export type AdminPlayerFiltersProps = {
  filters: AdminPlayerListParams
  places: { code: string; name: string }[]
  onChange: (patch: Partial<AdminPlayerListParams>) => void
  onClear: () => void
}
export function AdminPlayerFilters({
  filters: f,
  places,
  onChange,
  onClear,
}: AdminPlayerFiltersProps) {
  const count = [
    !!f.q,
    !!f.duplicates,
    !!f.addedFrom,
    !!f.addedTo,
    !!f.place?.length,
    !!f.level,
    f.account && f.account !== 'all',
    f.archived && f.archived !== 'active',
  ].filter(Boolean).length
  return (
    <section aria-label="Player filters" className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <TextInput
          type="search"
          aria-label="Search players"
          placeholder="Search by name, RTR ID, phone or email"
          value={f.q ?? ''}
          onChange={(e) => onChange({ q: e.target.value })}
        />
        <SegmentedControl
          aria-label="Account"
          value={f.account ?? 'all'}
          options={[
            { value: 'all', label: 'All' },
            { value: 'registered', label: 'Registered' },
            { value: 'unclaimed', label: 'Unclaimed' },
          ]}
          onChange={(account) => onChange({ account: account as AdminPlayerListParams['account'] })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Checkbox
          label="Duplicates only"
          checked={f.duplicates ?? false}
          onChange={(duplicates) => onChange({ duplicates })}
        />
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
        <Select
          aria-label="Archive status"
          value={f.archived ?? 'active'}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' },
            { value: 'all', label: 'All records' },
          ]}
          onChange={(archived) =>
            onChange({ archived: archived as AdminPlayerListParams['archived'] })
          }
        />
      </div>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-sm text-fg2">Place registered</legend>
        {places.map((p) => (
          <Checkbox
            key={p.code}
            label={`${p.name} (${p.code})`}
            checked={f.place?.includes(p.code) ?? false}
            onChange={(checked) =>
              onChange({
                place: checked
                  ? [...(f.place ?? []), p.code]
                  : (f.place ?? []).filter((c) => c !== p.code),
              })
            }
          />
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={onClear}>
          Clear filters
        </Button>
        <span className="text-sm text-fg2">
          {count} active filters · Phone and email search is only available in Admin.
        </span>
      </div>
    </section>
  )
}
