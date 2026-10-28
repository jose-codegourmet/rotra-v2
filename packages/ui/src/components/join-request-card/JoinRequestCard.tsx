'use client'

import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Notice, type NoticeProps } from '@rotra/ui/notice'
import { useId } from 'react'

export type JoinRequestCardVariant =
  | 'open'
  | 'full'
  | 'off'
  | 'sent'
  | 'confirmed-slot'
  | 'confirmed-waitlist'
  | 'declined'

type CommonProps = { className?: string }

export type JoinRequestCardProps = CommonProps &
  (
    | {
        /** Slots are open: "N of M slots open." and Request to join */
        variant: 'open'
        openSlots: number
        capacity: number
        onRequestToJoin: () => void
      }
    | {
        /** Every slot is taken: confirmed guests join the waitlist; Request to join stays */
        variant: 'full'
        onRequestToJoin: () => void
      }
    | {
        /** The club turned Accept join requests off: contact the Queue Master instead */
        variant: 'off'
      }
    | {
        /** This visitor's request is waiting for the Queue Master */
        variant: 'sent'
        /** The name the visitor typed in the request */
        name: string
      }
    | { variant: 'confirmed-slot' }
    | {
        variant: 'confirmed-waitlist'
        /** 1-based position on the waitlist */
        waitlistPosition: number
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
        text: `Thanks, ${props.name}. The Queue Master confirms every guest, usually at the venue. Your slot isn't held until they do.`,
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
        text: "You're on the waitlist. The Queue Master gives slots in order as they open.",
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

  if (props.variant === 'open' || props.variant === 'full') {
    const slots =
      props.variant === 'open'
        ? `${props.openSlots} of ${props.capacity} slots open.`
        : 'All slots are taken; confirmed guests join the waitlist.'
    return (
      <Card asChild className={cardClass}>
        <section aria-labelledby={headingId}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1 basis-60">
              <h2 id={headingId}>Want to play?</h2>
              <p className="m-0 text-[13px] text-fg2">
                {slots} Send a quick request and the Queue Master confirms it.
              </p>
            </div>
            <Button variant="primary" onClick={props.onRequestToJoin} className="max-sm:w-full">
              Request to join
            </Button>
          </div>
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
      </section>
    </Card>
  )
}
