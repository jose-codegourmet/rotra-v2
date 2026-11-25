import { shortTime } from '@rotra/schema/queue-time'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'

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
  className?: string
}

/** Wait and In queue: warning from 10 minutes, error from 16 (the text always says the time too). */
const waitTone = (minutes: number) => (minutes >= 16 ? 'error' : minutes >= 10 ? 'warn' : 'neutral')

function describe(status: StatusPillValue) {
  switch (status.kind) {
    case 'wait':
      return {
        text: `Wait ${shortTime(status.minutes)}`,
        title: `Free · waiting ${shortTime(status.minutes)} since their last game`,
        tone: waitTone(status.minutes),
      } as const
    case 'queued':
      return {
        text: `In queue ${shortTime(status.minutes)}`,
        title: `In the Main Queue · waiting ${shortTime(status.minutes)} since their last game`,
        tone: waitTone(status.minutes),
      } as const
    case 'playing':
      return {
        text: `Playing ${shortTime(status.minutes)}`,
        title: `Playing on ${status.courtLabel}`,
        label: `Playing on ${status.courtLabel} for ${shortTime(status.minutes)}`,
        tone: 'accent',
      } as const
    case 'ready':
      return {
        text: 'Getting ready',
        title: `Getting ready · ${status.courtLabel}`,
        label: `Getting ready on ${status.courtLabel}`,
        tone: 'accent',
      } as const
    case 'away':
      return { text: 'Away', title: undefined, tone: 'neutral' } as const
  }
}

/**
 * The prototype's .spill: one short pill for where a player is right now, on the Players cards and
 * under each Main Queue face. "Wait 2m", "In queue 2m", "Playing 1m" (hover: "Playing on Court 1"),
 * "Getting ready" (hover names the court) or "Away" (muted, dashed border). Times use shortTime().
 */
export function StatusPill({ status, size = 'md', className }: StatusPillProps) {
  const { text, title, tone, ...rest } = describe(status)
  const label = 'label' in rest ? rest.label : undefined
  return (
    <Chip
      tone={tone}
      title={title}
      aria-label={label}
      className={cn(
        'cursor-default tabular-nums',
        status.kind === 'away' && 'border-dashed text-fg3',
        size === 'sm' && 'px-1.5 py-px text-[11px]',
        className,
      )}
    >
      {text}
    </Chip>
  )
}
