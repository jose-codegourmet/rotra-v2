import type { AdminPlayer } from '@rotra/data/admin-player/types'
import { Chip } from '@rotra/ui/chip'
export type AdminPlayerClubsProps = { clubs: AdminPlayer['clubs']; expanded?: boolean }
export function AdminPlayerClubs({ clubs, expanded }: AdminPlayerClubsProps) {
  return (
    <div
      className="flex flex-wrap gap-1"
      title={clubs.map((c) => `${c.name} (${c.identity})`).join(', ')}
    >
      {(expanded ? clubs : clubs.slice(0, 2)).map((c) => (
        <Chip
          key={c.clubId}
          tone={c.identity === 'pending' || c.identity === 'guest' ? 'neutral' : 'accent'}
        >
          {c.name}
          {c.identity === 'pending' || c.identity === 'guest' ? ` · ${c.identity}` : ''}
        </Chip>
      ))}
      {!expanded && clubs.length > 2 ? <Chip>+{clubs.length - 2}</Chip> : null}
      {!clubs.length ? <span className="text-sm text-fg2">No clubs</span> : null}
    </div>
  )
}
