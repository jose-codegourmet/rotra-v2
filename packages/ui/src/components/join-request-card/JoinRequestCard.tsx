'use client'

import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Notice, type NoticeProps } from '@rotra/ui/notice'
import {
  SkillDistributionBar,
  type SkillDistributionCounts,
} from '@rotra/ui/skill-distribution-bar'
import { useId } from 'react'

export type JoinRequestCardVariant =
  | 'open'
  | 'full'
  | 'active'
  | 'off'
  | 'sent'
  | 'confirmed-slot'
  | 'confirmed-waitlist'
  | 'declined'

type CommonProps = { className?: string }
type AvailabilityProps = {
  /** Aggregate skill counts for confirmed players; omitted or empty hides the bar. */
  skillMix?: SkillDistributionCounts
  onRequestToJoin: () => void
  /** Sending needs internet: disable the button while offline. */
  disabled?: boolean
  /**
   * Signed-in ROTRA player not in the session: one tap sends the request ("Request to join as
   * NAME"), so onRequestToJoin sends directly instead of opening the form.
   */
  signedInName?: string
}

export type JoinRequestCardProps = CommonProps &
  (
    | ({
        /** Slots are open: "N slots left" and Request to join */
        variant: 'open'
        openSlots: number
        capacity: number
      } & AvailabilityProps)
    | ({
        /** Every slot is taken: confirmed guests join the waitlist; Request to join stays */
        variant: 'full'
      } & AvailabilityProps)
    | ({ variant: 'active' } & AvailabilityProps)
    | {
        /** The club turned Accept join requests off: contact the Queue Master instead */
        variant: 'off'
      }
    | {
        /** This visitor's request is waiting for the Queue Master */
        variant: 'sent'
        /** The name the visitor typed in the request */
        name: string
        /** Signed-in variant: shows Cancel request; the copy says "every request" */
        onCancelRequest?: () => void
        /** Disable Cancel request (offline or while cancelling) */
        disabled?: boolean
      }
    | { variant: 'confirmed-slot' }
    | {
        variant: 'confirmed-waitlist'
        /** 1-based position on the waitlist */
        waitlistPosition: number
        /** Signed-in player: "Ask the Queue Master about a slot." */
        signedIn?: boolean
      }
    | { variant: 'declined' }
  )

type StatusProps = Extract<
  JoinRequestCardProps,
  { variant: 'sent' | 'confirmed-slot' | 'confirmed-waitlist' | 'declined' }
>

/** The prototype's status notices: warn while pending, ok when confirmed, bad when declined. */
function statusOf(props: StatusProps): {
  tone: NonNullable<NoticeProps['tone']>
  title: string
  text: string
} {
  switch (props.variant) {
    case 'sent':
      return {
        tone: 'warn',
        title: 'Request sent',
        text: `Thanks, ${props.name}. The Queue Master confirms every ${props.onCancelRequest ? 'request' : 'guest'}, usually at the venue. Your slot isn't held until they do.`,
      }
    case 'confirmed-slot':
      return {
        tone: 'success',
        title: 'Confirmed · you have a slot',
        text: 'See you on court. Your name is now in Participants.',
      }
    case 'confirmed-waitlist':
      return {
        tone: 'success',
        title: `Confirmed · waitlist #${props.waitlistPosition}`,
        text: props.signedIn
          ? "You're on the waitlist. Ask the Queue Master about a slot."
          : "You're on the waitlist. The Queue Master gives slots in order as they open.",
      }
    case 'declined':
      return {
        tone: 'error',
        title: 'Request not accepted',
        text: "The Queue Master didn't confirm this request. Contact them if you think it's a mistake.",
      }
  }
}

/**
 * Q-PUBLIC-JOIN › the public session page's Want to play? card (prototype joinCard / .join-card):
 * open or full with Request to join, off when the club is not taking requests online, and the
 * visitor's own status afterwards: Request sent, Confirmed · you have a slot, Confirmed ·
 * waitlist #N, or Request not accepted. A request is never a booking.
 */
export function JoinRequestCard(props: JoinRequestCardProps) {
  const id = useId()
  const headingId = `${id}-h`
  // .join-card: the card keeps the accent border in every variant.
  const cardClass = cn('flex flex-col gap-3 border-accent', props.className)

  if (props.variant === 'off') {
    return (
      <Card asChild className={cardClass}>
        <section aria-label="Want to play?">
          <p className="m-0 text-[13px] text-fg2">
            This session isn't taking requests online. Contact the Queue Master to play.
          </p>
        </section>
      </Card>
    )
  }

  if (props.variant === 'open' || props.variant === 'full' || props.variant === 'active') {
    const skillMix = props.skillMix
    const hasPlayers =
      skillMix &&
      skillMix.beginner + skillMix.intermediate + skillMix.advanced + (skillMix.unrated ?? 0) > 0
    return (
      <Card asChild className={cardClass}>
        <section aria-labelledby={headingId}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
            <h2 id={headingId}>Want to play?</h2>
            {props.variant === 'open' ? (
              <span className="text-[13px] text-fg2">
                <b className="text-xl tabular-nums text-accent">{props.openSlots}</b>{' '}
                {props.openSlots === 1 ? 'slot' : 'slots'} left
              </span>
            ) : props.variant === 'full' ? (
              <span className="text-[13px] font-semibold text-warn">All slots taken</span>
            ) : (
              <span className="text-[13px] text-fg2">Additional players can be admitted</span>
            )}
          </div>
          {hasPlayers && skillMix ? <SkillDistributionBar counts={skillMix} /> : null}
          <p className="m-0 text-[13px] text-fg2">
            {props.variant === 'active'
              ? 'The Queue Master can admit additional players. '
              : props.variant === 'full'
                ? 'Confirmed guests join the waitlist. '
                : ''}
            {props.signedInName
              ? 'One tap sends your request and the Queue Master confirms it.'
              : 'Send a quick request and the Queue Master confirms it.'}
          </p>
          <Button
            variant="primary"
            onClick={props.onRequestToJoin}
            disabled={props.disabled}
            className="min-h-11 w-full"
          >
            {props.signedInName ? `Request to join as ${props.signedInName}` : 'Request to join'}
          </Button>
        </section>
      </Card>
    )
  }

  const status = statusOf(props)
  return (
    <Card asChild className={cardClass}>
      <section aria-label={status.title}>
        <Notice tone={status.tone} title={status.title}>
          <span className="block">{status.text}</span>
        </Notice>
        {props.variant === 'sent' && props.onCancelRequest ? (
          <Button
            variant="secondary"
            onClick={props.onCancelRequest}
            disabled={props.disabled}
            className="min-h-11 w-full"
          >
            Cancel request
          </Button>
        ) : null}
      </section>
    </Card>
  )
}
