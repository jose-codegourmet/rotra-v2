import { Avatar } from '@rotra/ui/avatar'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import {
  type RecordPlayerCardVariants,
  recordPlayerCardVariants,
} from './RecordPlayerCard.variants'

export type RecordPlayerCardProps = RecordPlayerCardVariants & {
  player: {
    id: string
    name: string
    /** Picture URL; initials show when missing */
    photoUrl?: string
  }
  /** The player's level as locked for the session, already formatted: "Intermediate Mid" */
  levelLabel: string
  /** Standing in the session; omitted for players without a counted game */
  rank?: number
  /** Counted games */
  games: number
  /** The session's minimum games */
  minimum: number
  wins: number
  losses: number
  /** The picture opens the player's profile */
  onSelectPlayer: (playerId: string) => void
  className?: string
}

/**
 * One player on the session record's Players tab: picture, rank chip, name, level, counted games
 * against the minimum, W–L and the minimum chip (Above minimum / Met minimum / N short). The
 * not-counted variant (invalid session) shows "Not counted" instead. The prototype's .pcard2.
 */
export function RecordPlayerCard({
  variant = 'counted',
  player,
  levelLabel,
  rank,
  games,
  minimum,
  wins,
  losses,
  onSelectPlayer,
  className,
}: RecordPlayerCardProps) {
  return (
    <article className={cn(recordPlayerCardVariants({ variant }), className)}>
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelectPlayer(player.id)}
          aria-label={`${player.name}. View profile`}
          title={player.name}
          className="m-0 flex-none rounded-full border-0 bg-transparent p-0 leading-none [&>span]:hover:shadow-[0_0_0_2px_var(--accent)]"
        >
          <Avatar name={player.name} src={player.photoUrl} size={64} />
        </button>
        {rank != null ? <Chip tone={rank <= 3 ? 'accent' : 'neutral'}>#{rank}</Chip> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="leading-[1.3] font-bold [overflow-wrap:anywhere]">{player.name}</span>
        <span className="text-[13px] text-fg2">{levelLabel}</span>
      </div>
      {variant === 'not-counted' ? (
        <p className="text-[13px] text-fg2">Not counted</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex flex-col rounded-md bg-bg px-2 py-1.5">
              <b className="text-base font-bold tabular-nums">
                {games}
                <span className="text-[11px] text-fg2">/{minimum}</span>
              </b>
              <span className="text-[11px] text-fg2">games</span>
            </div>
            <div className="flex flex-col rounded-md bg-bg px-2 py-1.5">
              <b className="text-base font-bold tabular-nums">
                {wins}–{losses}
              </b>
              <span className="text-[11px] text-fg2">W–L</span>
            </div>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-1.5">
            {games > minimum ? (
              <Chip tone="accent">Above minimum</Chip>
            ) : games === minimum ? (
              <Chip>Met minimum</Chip>
            ) : (
              <Chip tone="warn">{minimum - games} short</Chip>
            )}
          </div>
        </>
      )}
    </article>
  )
}
