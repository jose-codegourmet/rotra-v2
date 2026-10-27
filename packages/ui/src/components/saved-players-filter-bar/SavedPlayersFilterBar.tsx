'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Field } from '@rotra/ui/field'
import { Select, type SelectOption } from '@rotra/ui/select'
import { TextInput } from '@rotra/ui/text-input'

export type SavedPlayersFilters = {
  search: string
  band: 'all' | 'beginner' | 'intermediate' | 'advanced' | 'none'
  /** 'all', a city name, or 'none' (not registered yet) */
  city: string
  added: 'any' | '7' | '30' | '90' | 'older'
  status: 'all' | 'registered' | 'unclaimed' | 'guest'
  live: 'all' | 'playing' | 'waiting' | 'session'
}

export const DEFAULT_SAVED_PLAYERS_FILTERS: SavedPlayersFilters = {
  search: '',
  band: 'all',
  city: 'all',
  added: 'any',
  status: 'all',
  live: 'all',
}

export type SavedPlayersFilterBarProps = {
  value: SavedPlayersFilters
  onChange: (next: SavedPlayersFilters) => void
  /** Cities that saved players registered in, for "Registered in" */
  cities: string[]
  shownCount: number
  totalCount: number
  /** Title of the live session, or null when none is live (the Right now filter is then disabled) */
  liveSessionTitle: string | null
  className?: string
}

const SELECTS = {
  band: [
    'Skill level',
    [
      ['all', 'All levels'],
      ['beginner', 'Beginner'],
      ['intermediate', 'Intermediate'],
      ['advanced', 'Advanced'],
      ['none', 'No level yet'],
    ],
  ],
  added: [
    'Added',
    [
      ['any', 'Any time'],
      ['7', 'Last 7 days'],
      ['30', 'Last 30 days'],
      ['90', 'Last 3 months'],
      ['older', 'More than 3 months ago'],
    ],
  ],
  status: [
    'Account',
    [
      ['all', 'Everyone'],
      ['registered', 'Registered'],
      ['unclaimed', 'Unclaimed profile'],
      ['guest', 'Guest'],
    ],
  ],
  live: [
    'Right now',
    [
      ['all', 'Anyone'],
      ['playing', 'Playing now'],
      ['waiting', 'At the session, not playing'],
      ['session', 'In the live session'],
    ],
  ],
} as const

const FILTER_KEYS = ['band', 'city', 'added', 'status', 'live'] as const

// Compact sizing inside a narrow bar (≤ 620 px container), as the prototype's .sp-tools does.
const compactField = cn(
  '@max-[620px]:gap-0.5 @max-[620px]:[&>label]:text-[11px] @max-[620px]:[&>label]:tracking-[0.05em] @max-[620px]:[&>label]:uppercase',
)
const compactControl =
  '@max-[620px]:min-h-9 @max-[620px]:px-2.5 @max-[620px]:py-1 @max-[620px]:text-[13px]'

/**
 * The Saved players search and filters. Lays itself out by its own width (container queries), so it
 * compacts the same way in a narrow column, a collapsed-nav layout or a phone.
 */
export function SavedPlayersFilterBar({
  value,
  onChange,
  cities,
  shownCount,
  totalCount,
  liveSessionTitle,
  className,
}: SavedPlayersFilterBarProps) {
  const set = <K extends keyof SavedPlayersFilters>(key: K, next: SavedPlayersFilters[K]) =>
    onChange({ ...value, [key]: next })
  const active = FILTER_KEYS.filter((k) => value[k] !== DEFAULT_SAVED_PLAYERS_FILTERS[k]).length

  const optionsFor = (key: (typeof FILTER_KEYS)[number]): SelectOption[] => {
    if (key === 'city') {
      return [
        { value: 'all', label: 'Anywhere' },
        ...cities.map((c) => ({ value: c, label: c })),
        { value: 'none', label: 'Not registered yet' },
      ]
    }
    return SELECTS[key][1].map(([v, l]) => ({
      value: v,
      label: l,
      disabled: key === 'live' && v !== 'all' && !liveSessionTitle,
    }))
  }
  const labelFor = (key: (typeof FILTER_KEYS)[number]) =>
    key === 'city' ? 'Registered in' : SELECTS[key][0]

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="@container">
        <div
          className={cn(
            'grid grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))] items-end gap-2.5',
            '@max-[1000px]:grid-cols-3 @max-[620px]:grid-cols-2 @max-[620px]:gap-2 @max-[340px]:grid-cols-1',
          )}
        >
          <Field label="Search" className={cn('@max-[1000px]:col-span-full', compactField)}>
            <TextInput
              type="search"
              placeholder="Name or nickname"
              value={value.search}
              onChange={(e) => set('search', e.target.value)}
              className="@max-[620px]:min-h-[42px] @max-[620px]:text-[15px]"
            />
          </Field>
          {FILTER_KEYS.map((key) => (
            <Field key={key} label={labelFor(key)} className={compactField}>
              <Select
                options={optionsFor(key)}
                value={value[key]}
                onChange={(next) => set(key, next as never)}
                className={compactControl}
              />
            </Field>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <span aria-live="polite" className="text-fg2">
          Showing {shownCount} of {totalCount} ·{' '}
          {liveSessionTitle ? `${liveSessionTitle} is live` : 'No session is live right now'}
        </span>
        {active || value.search ? (
          <Button size="xs" variant="ghost" onClick={() => onChange(DEFAULT_SAVED_PLAYERS_FILTERS)}>
            {active ? `Clear ${active} filter${active > 1 ? 's' : ''}` : 'Clear search'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
