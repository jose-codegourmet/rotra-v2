import { Avatar, type AvatarProps } from '@rotra/ui/avatar'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { type LeaderboardRowVariants, leaderboardRowVariants } from './LeaderboardRow.variants'

export type LeaderboardRowProps = LeaderboardRowVariants & {
  id?: string
  position: number
  fullName: string
  nickname?: string | null
  levelLabel: string
  picture?: Pick<AvatarProps, 'src' | 'initials'>
  isMe?: boolean
  masked?: boolean
  /** Opened from a profile's Overall box: an accent wash that fades out (about 1.6 s) */
  flash?: boolean
  onSelect: () => void
}

function positionLabel(
  position: number,
  variant: LeaderboardRowVariants['variant'],
  isMe: boolean,
) {
  const medal = variant?.startsWith('medal-') ? variant.replace('medal-', '') : undefined
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
  id,
  position,
  fullName,
  nickname,
  levelLabel,
  picture,
  isMe = false,
  variant,
  onSelect,
  masked = false,
  flash = false,
}: LeaderboardRowProps) {
  const rowVariant = variant ?? (isMe ? 'me' : 'default')
  const medal = rowVariant.startsWith('medal-')
  const accessibleName = `${positionLabel(position, rowVariant, isMe)} ${fullName}, ${levelLabel}`

  // The prototype's every row is a button, masked or not: opening a masked profile shows the
  // private card (or the sign-in gate for visitors).
  return (
    <button
      id={id}
      type="button"
      onClick={onSelect}
      aria-label={accessibleName}
      className={cn(
        leaderboardRowVariants({ variant: masked ? 'masked' : rowVariant }),
        'group/leaderboard-row',
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
      <span className="col-start-3 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <b className={cn('min-w-0 [overflow-wrap:anywhere]', medal && 'text-base')}>{fullName}</b>
        {!masked && nickname ? <span className="text-[13px] text-fg2">“{nickname}”</span> : null}
        {isMe ? <Chip tone="accent">You</Chip> : null}
      </span>
      <span
        className={cn(
          'justify-self-end text-[13px] font-semibold text-fg2 max-[560px]:col-start-3 max-[560px]:justify-self-start max-[560px]:text-xs',
          medal && 'text-fg',
        )}
      >
        {levelLabel}
      </span>
    </button>
  )
}
