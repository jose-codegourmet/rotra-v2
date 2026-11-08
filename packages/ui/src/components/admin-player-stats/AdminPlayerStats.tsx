'use client'
import type {
  AdminPlayerListParams,
  AdminPlayerStats as Stats,
} from '@rotra/data/admin-player/types'

export type AdminPlayerStatsProps = {
  stats?: Stats
  filters: AdminPlayerListParams
  onChange: (patch: Partial<AdminPlayerListParams>) => void
}

export function AdminPlayerStats({ stats, filters, onChange }: AdminPlayerStatsProps) {
  const bands = ['advanced', 'intermediate', 'beginner', 'noRank'] as const
  const cards = [
    ...bands.map((key) => {
      const level = key === 'noRank' ? 'none' : key
      return {
        key,
        label: key === 'noRank' ? 'No rank' : key.charAt(0).toUpperCase() + key.slice(1),
        value: stats?.[key],
        active: filters.level === level,
        select: () =>
          onChange({ level: filters.level === level ? undefined : level, account: 'all' }),
        account: false,
      }
    }),
    ...(['registered', 'unclaimed'] as const).map((key) => ({
      key,
      label: key === 'registered' ? 'Registered' : 'Unclaimed',
      value: stats?.[key],
      active: filters.account === key,
      select: () => onChange({ account: filters.account === key ? 'all' : key }),
      account: true,
    })),
  ]
  return (
    <fieldset
      aria-label="Player counts"
      className="mb-3.5 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,104px),1fr))] gap-2.5"
    >
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          aria-pressed={card.active}
          onClick={card.select}
          className="flex flex-col items-start gap-1 rounded-lg border border-border bg-surface shadow-card px-3.5 py-3 text-left text-fg hover:border-border-strong hover:bg-elev focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="text-xs text-fg2">{card.label}</span>
          <b
            className={`text-[26px] leading-[1.1] tabular-nums ${card.account ? 'text-accent' : ''}`}
          >
            {card.value ?? '–'}
          </b>
        </button>
      ))}
    </fieldset>
  )
}
