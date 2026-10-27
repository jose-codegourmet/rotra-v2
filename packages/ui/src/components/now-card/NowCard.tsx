import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import type { ReactNode } from 'react'
import { formatCountdown, formatDuration, formatShortDate, formatTime } from './NowCard.helpers'
import { nowCardVariants } from './NowCard.variants'

export type NowCardLive = {
  variant: 'live'
  title: string
  venueName: string
  startsAt: number
  endsAt: number
  courtsInUse: number
  courts: number
  gamesPlayed: number
  presentCount: number
  rosterCount: number
  queuedCount: number
  /** Another prepared session after this one */
  upNext?: { title: string; startsAt: number }
  onContinue: () => void
}

export type NowCardUpcoming = {
  variant: 'upcoming'
  title: string
  venueName: string
  startsAt: number
  endsAt: number
  rosterCount: number
  capacity: number
  waitlistCount: number
  courts: number
  downloadedHere: boolean
  onOpenPreparation: () => void
}

export type NowCardNothing = {
  variant: 'nothing'
  onCreateSession: () => void
}

export type NowCardProps = (NowCardLive | NowCardUpcoming | NowCardNothing) & {
  /** The current time; stories pass a fixed one so countdowns stay stable */
  now?: number
  className?: string
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col">
      <b className="text-xl leading-[1.2] tabular-nums">{value}</b>
      <span className="text-xs text-fg2">{label}</span>
    </div>
  )
}

const BADGE =
  'inline-flex items-center gap-2 self-start rounded-full px-[11px] py-1 text-xs font-extrabold uppercase'

/**
 * The dashboard's now card: exactly one of Live (accent edge, tint and a filled pulsing LIVE NOW
 * badge), Upcoming (neutral edge, outlined badge with a countdown) or Nothing planned.
 */
export function NowCard(props: NowCardProps) {
  const now = props.now ?? Date.now()
  const sectionClass = cn(nowCardVariants({ variant: props.variant }), props.className)
  const actionsClass =
    'flex flex-col items-end gap-2 text-right max-[700px]:items-stretch max-[700px]:text-left'

  if (props.variant === 'live') {
    const left = props.endsAt - now
    return (
      <section aria-label="Live session" className={sectionClass}>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={cn(BADGE, 'bg-accent tracking-[0.08em] text-on-accent')}>
            <i
              aria-hidden
              className="size-2 rounded-full bg-on-accent animate-[pulse_1.4s_infinite] motion-reduce:animate-none"
            />
            Live now
          </span>
          <h2 className="text-[26px] tracking-[-0.5px] [overflow-wrap:anywhere]">{props.title}</h2>
          <p className="m-0 text-[13px] text-fg2">
            {props.venueName} · {formatTime(props.startsAt)}–{formatTime(props.endsAt)} ·{' '}
            {left > 0 ? `${formatDuration(now, props.endsAt)} left` : 'past its end time'}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-7 gap-y-2.5">
            <Stat value={`${props.courtsInUse}/${props.courts}`} label="courts in use" />
            <Stat value={props.gamesPlayed} label="games played" />
            <Stat value={`${props.presentCount}/${props.rosterCount}`} label="players present" />
            <Stat value={props.queuedCount} label="queued" />
          </div>
        </div>
        <div className={actionsClass}>
          <Button variant="primary" onClick={props.onContinue}>
            Continue session
          </Button>
          {props.upNext ? (
            <span className="text-[13px] text-fg2">
              Up next: {props.upNext.title} · {formatShortDate(props.upNext.startsAt)}
            </span>
          ) : null}
        </div>
      </section>
    )
  }

  if (props.variant === 'upcoming') {
    return (
      <section aria-label="Upcoming session" className={sectionClass}>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={cn(BADGE, 'border border-border-strong tracking-[0.04em] text-fg2')}>
            <Icon name="clock" size={13} />
            Upcoming · {formatCountdown(props.startsAt, now)}
          </span>
          <h2 className="text-[26px] tracking-[-0.5px] [overflow-wrap:anywhere]">{props.title}</h2>
          <p className="m-0 text-[13px] text-fg2">
            {formatShortDate(props.startsAt)} · {formatTime(props.startsAt)}–
            {formatTime(props.endsAt)} · {props.venueName}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-7 gap-y-2.5">
            <Stat value={`${props.rosterCount}/${props.capacity}`} label="slots filled" />
            <Stat value={props.waitlistCount} label="on the waitlist" />
            <Stat value={props.courts} label={`court${props.courts === 1 ? '' : 's'}`} />
            <Stat value={props.downloadedHere ? 'Ready' : 'No'} label="offline copy" />
          </div>
        </div>
        <div className={actionsClass}>
          <Button variant="primary" onClick={props.onOpenPreparation}>
            Open preparation
          </Button>
          <span className="text-[13px] text-fg2">Not started yet</span>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Next session" className={sectionClass}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className={cn(BADGE, 'border border-border-strong tracking-[0.04em] text-fg2')}>
          Nothing planned
        </span>
        <h2 className="text-[26px] tracking-[-0.5px]">Plan your next club night</h2>
      </div>
      <div className={actionsClass}>
        <Button variant="primary" onClick={props.onCreateSession}>
          Create session
        </Button>
      </div>
    </section>
  )
}
