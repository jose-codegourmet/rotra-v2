import { Avatar, type AvatarProps } from '@rotra/ui/avatar'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { LeaderboardMove, leaderboardMovement } from '@rotra/ui/leaderboard-move'
import { type LeaderboardPeriod, leaderboardWinsLabel } from '@rotra/ui/leaderboard-period-switch'
import { type LeaderboardRowVariants, leaderboardRowVariants } from './LeaderboardRow.variants'

export type LeaderboardRowProps = LeaderboardRowVariants & {
  id?: string
  position: number
  fullName: string
  nickname?: string | null
  levelLabel?: string
  period?: LeaderboardPeriod
  wins?: number
  /** Null means the player was absent from the previous list. */
  previousPosition?: number | null
  unclaimed?: boolean
  picture?: Pick<AvatarProps, 'src' | 'initials'>
  isMe?: boolean
  /** Another player has the same place: the accessible name adds ", shared" */
  shared?: boolean
  /** The player's club under the name (the Queue ROTRA board) */
  club?: string
  /** With `period`: "P% win rate" under the wins (the Queue Leaderboards page) */
  winRate?: number
  masked?: boolean
  /** The profile box jumps to this row, which flashes for about 1.6 seconds. */
  flash?: boolean
  /** Omit when privacy prevents opening the player's profile. */
  onSelect?: () => void
}

function positionLabel(position: number, variant: LeaderboardRowVariants['variant']) {
  const medal = variant?.startsWith('medal-') ? variant.replace('medal-', '') : undefined
  const place = medal === '1' ? 'First place' : medal === '2' ? 'Second place' : 'Third place'
  return medal ? place : `Number ${position.toLocaleString('en-PH')}`
}

function medalClasses(variant: LeaderboardRowVariants['variant']) {
  if (variant === 'medal-1') return 'bg-gold/20 text-gold ring-gold'
  if (variant === 'medal-2') return 'bg-silver/20 text-silver ring-silver'
  if (variant === 'medal-3') return 'bg-bronze/20 text-bronze ring-bronze'
  return 'text-fg2'
}

/** One player in a ROTRA leaderboard. */
export function LeaderboardRow({
  id,
  position,
  fullName,
  nickname,
  levelLabel,
  period,
  wins,
  previousPosition,
  unclaimed = false,
  picture,
  isMe = false,
  shared = false,
  club,
  winRate,
  variant,
  onSelect,
  masked = false,
  flash = false,
}: LeaderboardRowProps) {
  const rowVariant = variant ?? (isMe ? 'me' : 'default')
  const medal = rowVariant.startsWith('medal-')
  const winLabel = wins === undefined ? undefined : leaderboardWinsLabel(wins)
  const hasMovement = period !== undefined && previousPosition !== undefined
  const movement = hasMovement ? leaderboardMovement(period, position, previousPosition) : undefined
  const detail = period ? winLabel : levelLabel
  const identity = [
    `${positionLabel(position, rowVariant)}${shared ? ', shared' : ''}`,
    `${fullName}${isMe ? ' (you)' : ''}`,
    club,
    unclaimed ? 'not registered yet' : undefined,
    detail,
    period && winRate !== undefined ? `${winRate}% win rate` : undefined,
  ]
    .filter(Boolean)
    .join(', ')
  const accessibleName = movement ? `${identity}. ${movement.sentence}` : identity
  const Row = onSelect ? 'button' : 'div'

  return (
    <Row
      id={id}
      type={onSelect ? 'button' : undefined}
      onClick={onSelect}
      aria-label={onSelect ? accessibleName : undefined}
      aria-disabled={onSelect ? undefined : true}
      className={cn(
        leaderboardRowVariants({ variant: !period && masked ? 'masked' : rowVariant }),
        'group/leaderboard-row',
        period &&
          'grid-cols-[56px_30px_36px_minmax(0,1fr)_auto] max-[560px]:grid-cols-[34px_30px_36px_minmax(0,1fr)] max-[560px]:gap-x-2',
        onSelect &&
          'cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
        !onSelect && 'cursor-default hover:bg-transparent',
        rowVariant !== 'me' && 'shadow-[0_-1px_0_var(--border)] first:shadow-none',
        flash && 'animate-row-flash motion-reduce:animate-none',
      )}
    >
      <span
        className={cn(
          'justify-self-end font-mono text-[15px] font-semibold tabular-nums max-[560px]:row-span-2',
          medal && 'grid size-9 place-items-center rounded-full text-base ring-2',
          medalClasses(rowVariant),
        )}
      >
        {position.toLocaleString('en-PH')}
      </span>
      {hasMovement ? (
        <LeaderboardMove
          period={period}
          position={position}
          previousPosition={previousPosition}
          rowIsTrigger={!!onSelect}
        />
      ) : period ? (
        <span aria-hidden className="max-[560px]:row-span-2" />
      ) : null}
      <Avatar
        name={fullName}
        src={picture?.src}
        initials={masked ? undefined : picture?.initials}
        size={36}
        className={cn(
          'max-[560px]:row-span-2',
          medal && 'ring-2 ring-offset-2 ring-offset-surface',
          medal && medalClasses(rowVariant),
        )}
      />
      <span
        className={cn(
          'flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5',
          period ? 'col-start-4' : 'col-start-3',
        )}
      >
        <b className={cn('min-w-0 [overflow-wrap:anywhere]', medal && 'text-base')}>{fullName}</b>
        {!masked && nickname ? <span className="text-[13px] text-fg2">“{nickname}”</span> : null}
        {isMe ? <Chip tone="accent">You</Chip> : null}
        {unclaimed ? <Chip tone="warn">Not registered yet</Chip> : null}
        {club ? <span className="basis-full text-[13px] text-fg2">{club}</span> : null}
      </span>
      {period && winRate !== undefined ? (
        <span className="flex flex-col items-end gap-px text-right max-[560px]:col-start-4 max-[560px]:flex-row max-[560px]:items-baseline max-[560px]:gap-1.5 max-[560px]:justify-self-start max-[560px]:text-left">
          <b className="font-mono text-[15px] whitespace-nowrap tabular-nums max-[560px]:text-[13px]">
            {winLabel}
          </b>
          <span className="text-xs text-fg2">{winRate}% win rate</span>
        </span>
      ) : period ? (
        <b className="justify-self-end font-mono text-[15px] whitespace-nowrap tabular-nums max-[560px]:col-start-4 max-[560px]:justify-self-start max-[560px]:text-[13px]">
          {winLabel}
        </b>
      ) : (
        <span
          className={cn(
            'justify-self-end text-[13px] font-semibold text-fg2 max-[560px]:col-start-3 max-[560px]:justify-self-start max-[560px]:text-xs',
            medal && 'text-fg',
          )}
        >
          {levelLabel}
        </span>
      )}
    </Row>
  )
}
