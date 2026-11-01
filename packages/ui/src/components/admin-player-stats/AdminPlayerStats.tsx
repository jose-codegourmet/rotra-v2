'use client'
import type {
  AdminPlayerListParams,
  AdminPlayerStats as Stats,
} from '@rotra/data/admin-player/types'
import { SavedPlayerStatsCarousel } from '@rotra/ui/saved-player-stats-carousel'
export type AdminPlayerStatsProps = {
  stats?: Stats
  filters: AdminPlayerListParams
  onChange: (patch: Partial<AdminPlayerListParams>) => void
}
export function AdminPlayerStats({ stats, filters, onChange }: AdminPlayerStatsProps) {
  const bands = ['advanced', 'intermediate', 'beginner', 'noRank'] as const
  return (
    <SavedPlayerStatsCarousel
      label="Player statistics"
      caption="Of these results · Counts include every page"
      cards={[
        ...bands.map((key) => {
          const level = key === 'noRank' ? 'none' : key
          return {
            key,
            label: key === 'noRank' ? 'No rank' : key.charAt(0).toUpperCase() + key.slice(1),
            value: stats?.[key],
            active: filters.level === level,
            onSelect: () => onChange({ level: filters.level === level ? undefined : level }),
          }
        }),
        ...(['registered', 'unclaimed'] as const).map((key) => ({
          key,
          label: key === 'registered' ? 'Registered' : 'Unclaimed',
          value: stats?.[key],
          active: filters.account === key,
          onSelect: () => onChange({ account: filters.account === key ? 'all' : key }),
        })),
      ]}
    />
  )
}
