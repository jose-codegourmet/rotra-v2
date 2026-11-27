import { shortTime } from '@rotra/schema/queue-time'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { Icon, type IconName } from '@rotra/ui/icon'

/**
 * A player's live status (owner, November 25, 2026). `minutes` for Wait and In queue is the wait
 * since their last game (or since they became present); for Playing it is the time since the match
 * began.
 */
export type StatusPillValue =
  | { kind: 'wait'; minutes: number }
  | { kind: 'queued'; minutes: number }
  | { kind: 'playing'; minutes: number; courtLabel: string }
  | { kind: 'ready'; courtLabel: string }
  | { kind: 'away' }

export type StatusPillProps = {
  status: StatusPillValue
  /** `sm` under a Main Queue face; `md` (default) on a Players card */
  size?: 'sm' | 'md'
  /** Only the icon, as the Status legend draws each key; the words stay in the accessible name */
  iconOnly?: boolean
  className?: string
}

/** Wait and In queue: warning from 10 minutes, error from 16 (the text always says the time too). */
const waitTone = (minutes: number) => (minutes >= 16 ? 'error' : minutes >= 10 ? 'warn' : 'neutral')

/** The prototype's ST_ICO: hourglass (free), list (in queue), shuttlecock (playing), clock (getting ready), moon (away) */
const ICON: Record<StatusPillValue['kind'], IconName> = {
  wait: 'hourglass',
  queued: 'status-queue',
  playing: 'shuttlecock',
  ready: 'clock',
  away: 'moon',
}

/** The icon, the short text beside it, and the full words (hover and accessible name), as stPill */
function describe(status: StatusPillValue) {
  switch (status.kind) {
    case 'wait':
      return {
        text: shortTime(status.minutes),
        label: `Free · waiting ${shortTime(status.minutes)} since their last game`,
        tone: waitTone(status.minutes),
      } as const
    case 'queued':
      return {
        text: shortTime(status.minutes),
        label: `In queue · waiting ${shortTime(status.minutes)} since their last game`,
        tone: waitTone(status.minutes),
      } as const
    case 'playing':
      return {
        text: shortTime(status.minutes),
        label: `Playing on ${status.courtLabel} for ${shortTime(status.minutes)}`,
        tone: 'accent',
      } as const
    case 'ready':
      return {
        text: 'Ready',
        label: `Getting ready on ${status.courtLabel}`,
        tone: 'accent',
      } as const
    case 'away':
      return { text: 'Away', label: 'Away · not here', tone: 'neutral' } as const
  }
}

/**
 * The prototype's .spill / stPill: an icon plus only the time, for where a player is right now, on
 * the Players cards and under each Main Queue face. Hourglass "2m" (free, waiting), list "2m" (in
 * queue), shuttlecock "1m" (playing), clock "Ready" (getting ready on a court), moon "Away" (muted,
 * dashed border). The full words are the hover title and the accessible name. Times use shortTime().
 */
export function StatusPill({ status, size = 'md', iconOnly = false, className }: StatusPillProps) {
  const { text, label, tone } = describe(status)
  return (
    <Chip
      tone={tone}
      role="img"
      title={label}
      aria-label={label}
      className={cn(
        'cursor-default tabular-nums',
        status.kind === 'away' && 'border-dashed text-fg3',
        size === 'sm' && 'px-1.5 py-px text-[11px]',
        iconOnly && 'px-1.5 py-[3px]',
        className,
      )}
    >
      <Icon name={ICON[status.kind]} size={13} className="flex-none" />
      {iconOnly ? null : <span aria-hidden="true">{text}</span>}
    </Chip>
  )
}
