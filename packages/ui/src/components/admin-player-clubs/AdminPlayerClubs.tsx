import type { AdminPlayer } from '@rotra/data/admin-player/types'
import { Chip } from '@rotra/ui/chip'
import { NOT_ON_LEADERBOARD_NOTE, type SavedByClub } from './AdminPlayerClubs.helpers'

export type AdminPlayerClubsProps = {
  clubs: AdminPlayer['clubs']
  expanded?: boolean
  /**
   * An unclaimed player saved by more than one club: each club is listed with its own name for
   * them, then the line that they are not on the leaderboard. Replaces the chips.
   */
  savedBy?: SavedByClub[]
}
export function AdminPlayerClubs({ clubs, expanded, savedBy }: AdminPlayerClubsProps) {
  if (savedBy?.length) {
    return (
      <div className="flex flex-col gap-1">
        {savedBy.map((c) => (
          <span key={c.club}>
            {c.club} · saved as <b>{c.name}</b>
          </span>
        ))}
        <span className="text-sm text-fg2">{NOT_ON_LEADERBOARD_NOTE}</span>
      </div>
    )
  }
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
