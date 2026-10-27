import { Avatar, type AvatarProps } from '@rotra/ui/avatar'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { type LeaderboardRowVariants, leaderboardRowVariants } from './LeaderboardRow.variants'

export type LeaderboardRowProps = LeaderboardRowVariants & {
  position: number
  fullName: string
  nickname?: string | null
  levelLabel: string
  picture?: Pick<AvatarProps, 'src' | 'initials'>
  isMe?: boolean
  onSelect: () => void
}

function positionLabel(
  position: number,
  variant: LeaderboardRowVariants['variant'],
  isMe: boolean,
) {
  const medal = variant?.replace('medal-', '')
  const place = medal === '1' ? 'First place' : medal === '2' ? 'Second place' : 'Third place'
  return `${medal ? place : `Number ${position.toLocaleString('en-PH')}`},${isMe ? ' (you),' : ''}`
}

function medalClasses(variant: LeaderboardRowVariants['variant']) {
  if (variant === 'medal-1') return 'bg-gold/20 text-gold ring-gold'
  if (variant === 'medal-2') return 'bg-silver/20 text-silver ring-silver'
  if (variant === 'medal-3') return 'bg-bronze/20 text-bronze ring-bronze'
  return 'text-fg2'
}

/** One selectable player in the overall ROTRA leaderboard. */
export function LeaderboardRow({
  position,
  fullName,
  nickname,
  levelLabel,
  picture,
  isMe = false,
  variant,
  onSelect,
}: LeaderboardRowProps) {
  const rowVariant = variant ?? (isMe ? 'me' : 'default')
  const medal = rowVariant.startsWith('medal-')
  const accessibleName = `${positionLabel(position, rowVariant, isMe)} ${fullName}, ${levelLabel}`

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={accessibleName}
      className={cn(leaderboardRowVariants({ variant: rowVariant }), 'group/leaderboard-row')}
    >
      <span
        className={cn(
          'justify-self-end font-mono text-[15px] font-semibold tabular-nums',
          medal && 'grid size-9 place-items-center rounded-full text-base ring-2',
          medalClasses(rowVariant),
        )}
      >
        {position.toLocaleString('en-PH')}
      </span>
      <Avatar
        name={fullName}
        src={picture?.src}
        initials={picture?.initials}
        size={36}
        className={cn(
          medal && 'ring-2 ring-offset-2 ring-offset-surface',
          medal && medalClasses(rowVariant),
        )}
      />
      <span className="col-start-3 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <b className={cn('min-w-0 break-words', medal && 'text-base')}>{fullName}</b>
        {nickname ? <span className="text-sm text-fg2">“{nickname}”</span> : null}
        {isMe ? <Chip tone="accent">You</Chip> : null}
        <span className="col-start-3 text-sm text-fg2 min-[561px]:hidden">{levelLabel}</span>
      </span>
      <span
        className={cn(
          'justify-self-end text-sm font-semibold text-fg2 max-[560px]:hidden',
          medal && 'text-fg',
        )}
      >
        {levelLabel}
      </span>
    </button>
  )
}
