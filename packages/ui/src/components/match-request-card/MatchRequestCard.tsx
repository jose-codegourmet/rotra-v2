import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { levelLabel } from '@rotra/ui/level-pill'
import { Notice } from '@rotra/ui/notice'
import type { ReactNode } from 'react'

export type MatchRequestSpot = {
  role: 'Requester' | 'Partner' | 'Opponent'
  player?: {
    name: string
    photoUrl?: string
    games: number
    minimumGames: number
    level: PlayingLevel | null
    where?: string
  } | null
}
export type MatchRequestCardProps = {
  requesterName: string
  /** e.g. "2 v 2 doubles" or "3 v 3 fun" */
  formatLabel: string
  requestedLabel: string
  spots: MatchRequestSpot[]
  onDecline: () => void
  onAddToQueue: () => void
  isPending?: boolean
  error?: ReactNode
}

/** A request and its spots; filling Anyone and adding a match are caller responsibilities. */
export function MatchRequestCard({
  requesterName,
  formatLabel,
  requestedLabel,
  spots,
  onDecline,
  onAddToQueue,
  isPending = false,
  error,
}: MatchRequestCardProps) {
  return (
    <div className="flex flex-col gap-2.5 py-3">
      <div>
        <b>
          {requesterName} asks for a {formatLabel} match
        </b>
        <p className="m-0 text-[13px] text-fg2">Requested {requestedLabel}</p>
      </div>
      <div className="flex flex-col gap-2">
        {spots.map((spot, i) => (
          <div key={`${spot.role}-${i}`} className="flex min-w-0 items-center gap-3">
            {spot.player ? (
              <Avatar name={spot.player.name} src={spot.player.photoUrl} />
            ) : (
              <Avatar name="Anyone" initials="?" />
            )}
            <div className="min-w-0 flex-1">
              <b>{spot.player?.name ?? 'Anyone'}</b>{' '}
              <span className="text-[13px] text-fg2">· {spot.role}</span>
              <p className="m-0 text-[13px] text-fg2">
                {spot.player ? (
                  <>
                    {spot.player.games} of {spot.player.minimumGames} games ·{' '}
                    {levelLabel(spot.player.level)}
                    {spot.player.where ? ` · ${spot.player.where}` : ''}
                  </>
                ) : (
                  'Filled from present players with the fewest games'
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={isPending} onClick={onDecline}>
          Decline
        </Button>
        <Button size="sm" variant="primary" disabled={isPending} onClick={onAddToQueue}>
          Add to queue
        </Button>
      </div>
    </div>
  )
}
