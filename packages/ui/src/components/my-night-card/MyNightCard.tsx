import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { ProgressBar } from '@rotra/ui/progress-bar'
import type { ReactNode } from 'react'

export type MyNightStage =
  | 'waitlisted'
  | 'before-start'
  | 'live-not-present'
  | 'live-present'
  | 'finished'

export type MyNightCardProps = {
  stage: MyNightStage
  /** Waitlisted: the player's place on the waitlist (1 = next) */
  waitlistPosition?: number
  /** Before start: "Confirmed · starts DATE, TIME", e.g. "Nov 9, 7:30 PM" */
  startsLabel?: string
  /** Before start: the player already told the Queue Master they can't make it */
  cantMakeItSent?: boolean
  /** Live, not present: the player tapped I'm leaving earlier tonight */
  hasLeft?: boolean
  /** Live, not present: the club turned self check-in off; the player cannot tap I'm here */
  selfCheckInOff?: boolean
  /** Live, present: the player checked in themselves this session */
  checkedIn?: boolean
  /** This device is offline: I'm leaving, I can't make it, Cancel, Request a match and Invite are disabled ("You're offline. Reconnect and try again."); I'm here still works and the Queue Master sees the check-in after a sync */
  offline?: boolean
  /** Live, present: games played, won, lost */
  games?: number
  won?: number
  lost?: number
  /** The session's minimum games. Omit or 0 when the session has none */
  minimum?: number
  /** Live, present: queued position (1 = next) and the match, e.g. "with A vs B, C" */
  queuePosition?: number
  /** "with Ana vs Ben, Cy": the match the player is in or queued for */
  matchLabel?: string
  /** Live, present: the player is playing now, e.g. "Court 2" */
  courtLabel?: string
  /** Live, present: an open match request waits for the Queue Master */
  matchRequestOpen?: boolean
  /** Invite shows only while the session is Prepared and requests are on */
  canInvite?: boolean
  /** Finished: where the Match history link goes */
  matchHistoryHref?: string
  /** Disables the action buttons while a write is pending */
  pending?: boolean
  onCheckIn?: () => void
  onLeave?: () => void
  onCantMakeIt?: () => void
  onRequestMatch?: () => void
  onCancelMatchRequest?: () => void
  onInvite?: () => void
  className?: string
}

const OFFLINE_TITLE = "You're offline. Reconnect and try again."

const BIG_TILE = 'flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg border p-3'

function StatsPanel({
  games,
  won,
  lost,
  minimum,
}: {
  games: number
  won: number
  lost: number
  minimum: number
}) {
  const hasMinimum = minimum > 0
  const done = hasMinimum && games >= minimum
  return (
    // biome-ignore lint/a11y/useSemanticElements: a group/region div; a fieldset or section would change the drawn layout
    <div
      role="group"
      aria-label="Your night so far"
      className="grid grid-cols-1 items-stretch gap-3 min-[421px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
    >
      <div className="flex min-w-0 flex-col justify-center gap-1.5 rounded-lg border border-border bg-bg p-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <b className="text-[40px] leading-none font-extrabold tracking-[-1px] tabular-nums">
            {games}
          </b>
          <span className="text-[13px] text-fg2">
            {games === 1 ? 'game' : 'games'} played{hasMinimum ? ` · minimum ${minimum}` : ''}
          </span>
        </div>
        {hasMinimum ? (
          <>
            <ProgressBar
              value={games}
              max={minimum}
              tone={done ? 'accent' : 'warn'}
              aria-label="Games toward the minimum"
            />
            {done ? (
              <span className="text-[13px] font-semibold text-accent">Minimum reached</span>
            ) : (
              <span className="text-[13px] text-fg2">
                {minimum - games} more to reach the minimum
              </span>
            )}
          </>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className={cn(BIG_TILE, 'border-accent/45 bg-accent-subtle')}>
          <b className="text-[32px] leading-none font-extrabold text-accent tabular-nums">{won}</b>
          <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">Won</span>
        </div>
        <div className={cn(BIG_TILE, 'border-error/45 bg-error-subtle')}>
          <b className="text-[32px] leading-none font-extrabold text-error tabular-nums">{lost}</b>
          <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">Lost</span>
        </div>
      </div>
    </div>
  )
}

/**
 * The My night card on the public session page for a signed-in player: stage-driven lines, the games
 * and Won / Lost stats panel, and the player's own actions (I'm here, I'm leaving, I can't make it,
 * Request a match, Invite). Presentational: it reports taps through callbacks.
 */
export function MyNightCard({
  stage,
  waitlistPosition,
  startsLabel,
  cantMakeItSent = false,
  hasLeft = false,
  selfCheckInOff = false,
  checkedIn = false,
  offline = false,
  games = 0,
  won = 0,
  lost = 0,
  minimum = 0,
  queuePosition,
  matchLabel,
  courtLabel,
  matchRequestOpen = false,
  canInvite = false,
  matchHistoryHref,
  pending = false,
  onCheckIn,
  onLeave,
  onCantMakeIt,
  onRequestMatch,
  onCancelMatchRequest,
  onInvite,
  className,
}: MyNightCardProps) {
  // Offline, only I'm here still works (it queues); every other write is refused
  const blocked = pending || offline
  const offlineTitle = offline ? OFFLINE_TITLE : undefined
  const lines: ReactNode[] = []
  const actions: ReactNode[] = []
  let stats: ReactNode = null
  let highlight = false

  if (stage === 'waitlisted') {
    lines.push(`Waitlist #${waitlistPosition ?? 1} · you get a slot if one opens`)
  } else if (stage === 'before-start') {
    lines.push(`Confirmed · starts ${startsLabel ?? ''}`)
    if (cantMakeItSent) lines.push("Told the QM you can't make it")
    else
      actions.push(
        <Button key="cant" onClick={onCantMakeIt} disabled={blocked} title={offlineTitle}>
          I can't make it
        </Button>,
      )
  } else if (stage === 'finished') {
    lines.push('Session finished')
    stats = <StatsPanel games={games} won={won} lost={lost} minimum={0} />
    if (matchHistoryHref)
      actions.push(
        <Button key="history" asChild>
          <a href={matchHistoryHref}>Match history</a>
        </Button>,
      )
  } else if (stage === 'live-not-present') {
    if (hasLeft) lines.push("You've left · tap I'm here if you come back")
    if (selfCheckInOff) lines.push('Ask the Queue Master to mark you present.')
    else
      actions.push(
        <Button
          key="here"
          variant="primary"
          block
          className="col-span-full min-h-11"
          onClick={onCheckIn}
          disabled={pending}
        >
          I'm here
        </Button>,
      )
  } else {
    if (checkedIn)
      lines.push(offline ? 'Checked in · the QM will see it when their device syncs' : 'Checked in')
    stats = <StatsPanel games={games} won={won} lost={lost} minimum={minimum} />
    if (courtLabel) {
      highlight = true
      lines.push(`You're on ${courtLabel}${matchLabel ? ` · ${matchLabel}` : ''}`)
    } else if (queuePosition !== undefined && matchLabel) {
      lines.push(`In queue #${queuePosition} · ${matchLabel}`)
    } else {
      lines.push('Not in a queued match')
    }
    if (matchRequestOpen) {
      lines.push('Match request sent · the QM decides')
      actions.push(
        <Button key="cancel" onClick={onCancelMatchRequest} disabled={blocked} title={offlineTitle}>
          Cancel
        </Button>,
      )
    } else {
      actions.push(
        <Button
          key="request"
          variant="primary"
          onClick={onRequestMatch}
          disabled={blocked}
          title={offlineTitle}
        >
          Request a match
        </Button>,
      )
    }
    actions.push(
      <Button key="leave" onClick={onLeave} disabled={blocked} title={offlineTitle}>
        I'm leaving
      </Button>,
    )
  }

  if (canInvite && (stage === 'waitlisted' || stage === 'before-start'))
    actions.push(
      <Button key="invite" onClick={onInvite} disabled={offline} title={offlineTitle}>
        Invite
      </Button>,
    )

  return (
    <Card
      asChild
      tone={highlight ? 'highlight' : 'default'}
      className={cn('flex flex-col gap-3', className)}
    >
      <section aria-label="My night">
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">My night</span>
        {stats}
        {lines.map((line, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static, ordered lines
          <p key={i} className="m-0">
            {line}
          </p>
        ))}
        {actions.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center [&>*]:w-full sm:[&>*]:w-auto [&>*:last-child:nth-child(odd)]:col-span-full">
            {actions}
          </div>
        ) : null}
      </section>
    </Card>
  )
}
