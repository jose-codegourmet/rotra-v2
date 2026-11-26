'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Select } from '@rotra/ui/select'
import { tabFocusClass } from '@rotra/ui/tabs'

/**
 * Which players the grid shows: present and off court (Available), free players in a queued match
 * (In queue), players on a court (Playing), present, away (Not here), the waitlist
 * panel instead of cards, or the whole roster
 */
export type PlayerPoolShow =
  | 'available'
  | 'queue'
  | 'playing'
  | 'present'
  | 'away'
  | 'waitlist'
  | 'everyone'
/** The four sorts (owner, November 25, 2026) */
export type PlayerPoolSortKey = 'name' | 'games' | 'wait' | 'level'
/**
 * A sort and its direction. `dir` 1 is the sort's first direction: Name A–Z, Games fewest first,
 * Wait longest first, Level high to low; -1 is the other way.
 */
export type PlayerPoolSort = { key: PlayerPoolSortKey; dir: 1 | -1 }

export const DEFAULT_PLAYER_POOL_SORT: PlayerPoolSort = { key: 'wait', dir: 1 }

export type PlayerPoolToolbarProps = {
  show: PlayerPoolShow
  onShowChange: (show: PlayerPoolShow) => void
  /** Live counts for the seven filters */
  counts: {
    available: number
    queue: number
    playing: number
    present: number
    away: number
    waitlist: number
    everyone: number
  }
  sort: PlayerPoolSort
  onSortChange: (sort: PlayerPoolSort) => void
  className?: string
}

const SORT_KEYS: { key: PlayerPoolSortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'games', label: 'Games' },
  { key: 'wait', label: 'Wait' },
  { key: 'level', label: 'Level' },
]

/** Each sort's wording, first direction then the other */
export const PLAYER_POOL_SORT_DIRECTIONS: Record<PlayerPoolSortKey, [string, string]> = {
  name: ['name A–Z', 'name Z–A'],
  games: ['fewest games', 'most games'],
  wait: ['longest wait', 'shortest wait'],
  level: ['level, high to low', 'level, low to high'],
}

const directionOf = ({ key, dir }: PlayerPoolSort) =>
  PLAYER_POOL_SORT_DIRECTIONS[key][dir === 1 ? 0 : 1]

/** Name and Games read upwards in their first direction; Wait and Level downwards. */
const arrowOf = ({ key, dir }: PlayerPoolSort) =>
  (key === 'name' || key === 'games') === (dir === 1) ? 'up' : 'down'

/** The phone dropdown: every sort both ways, "name:1" … "level:-1" */
const SORT_OPTIONS = SORT_KEYS.flatMap(({ key }) =>
  ([1, -1] as const).map((dir) => ({
    value: `${key}:${dir}`,
    label: `Sort: ${directionOf({ key, dir })}`,
  })),
)

/**
 * The Players view filter and sort row: Available · N (default), In queue · N, Playing · N, Present · N, Not here · N,
 * Waitlist · N, Everyone · N; then the sort (hidden while Waitlist is shown). On desktop the sort is
 * a row of buttons at the right, Name · Games · Wait · Level: the active one shows its direction
 * arrow and tapping it again flips it; another starts in its first direction. At 760 px and
 * narrower it is the "Sort players" dropdown with both directions of each (owner, November 25, 2026).
 */
export function PlayerPoolToolbar({
  show,
  onShowChange,
  counts,
  sort,
  onSortChange,
  className,
}: PlayerPoolToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <SegmentedControl
        aria-label="Show"
        value={show}
        onChange={(value) => onShowChange(value as PlayerPoolShow)}
        options={[
          { value: 'available', label: `Available · ${counts.available}` },
          { value: 'queue', label: `In queue · ${counts.queue}` },
          { value: 'playing', label: `Playing · ${counts.playing}` },
          { value: 'present', label: `Present · ${counts.present}` },
          { value: 'away', label: `Not here · ${counts.away}` },
          { value: 'waitlist', label: `Waitlist · ${counts.waitlist}` },
          { value: 'everyone', label: `Everyone · ${counts.everyone}` },
        ]}
      />
      {show === 'waitlist' ? null : (
        <>
          <fieldset
            aria-label="Sort players"
            className="m-0 ml-auto inline-flex flex-wrap gap-[3px] rounded-lg border border-border-strong p-[3px] max-[760px]:hidden"
          >
            {SORT_KEYS.map(({ key, label }) => {
              const on = sort.key === key
              const next: PlayerPoolSort = { key, dir: on ? (sort.dir === 1 ? -1 : 1) : 1 }
              const current: PlayerPoolSort = on ? sort : { key, dir: 1 }
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Sort by ${label.toLowerCase()}, ${directionOf(current)}`}
                  title={on ? `${directionOf(current)} · tap to flip` : directionOf(current)}
                  onClick={() => onSortChange(next)}
                  className={cn(
                    'inline-flex min-h-9 items-center gap-1 rounded-[7px] border-0 bg-transparent px-3.5 font-semibold text-fg2',
                    'aria-pressed:bg-elev aria-pressed:text-fg touch:min-h-11 touch:px-4',
                    tabFocusClass,
                  )}
                >
                  {label}
                  {on ? <Icon name={arrowOf(sort)} size={14} /> : null}
                </button>
              )
            })}
          </fieldset>
          <Select
            aria-label="Sort players"
            value={`${sort.key}:${sort.dir}`}
            onChange={(value) => {
              const [key, dir] = value.split(':')
              onSortChange({ key: key as PlayerPoolSortKey, dir: dir === '-1' ? -1 : 1 })
            }}
            options={SORT_OPTIONS}
            className="w-auto min-h-[42px] min-[761px]:hidden"
          />
        </>
      )}
    </div>
  )
}
