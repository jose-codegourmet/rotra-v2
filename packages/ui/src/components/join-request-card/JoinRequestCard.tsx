'use client'

import type { JoinRequestPlacement } from '@rotra/data/session-roster/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ChoiceGroup } from '@rotra/ui/choice-group'
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
  | 'started'
  | 'sent'
  | 'confirmed-slot'
  | 'confirmed-waitlist'
  | 'declined'

type CommonProps = {
  className?: string
  /**
   * A guest's status card (Request sent, Confirmed, Request not accepted) adds "Register to check
   * in and see your matches." (D-2026-11-09-03). Off for a signed-in ROTRA Player.
   */
  registerNudge?: boolean
}
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
  /**
   * The signed-in player's choice (D-2026-11-11-02): Join a slot or Be waitlisted, shown above the
   * one-tap button when onPlacementChange is set. A guest picks on the form instead.
   */
  placement?: Extract<JoinRequestPlacement, 'slot' | 'waitlist'>
  onPlacementChange?: (placement: Extract<JoinRequestPlacement, 'slot' | 'waitlist'>) => void
  /**
   * D-2026-11-12-02: the signed-in Player is a club member on an upcoming session that lets members
   * join right away (Accept join requests on, Always require a request off). The card says
   * "You're a member of CLUB, so you get your place right away." and the button reads
   * "Join as NAME" (slot) or "Join the waitlist as NAME" (Be waitlisted, or every slot taken);
   * onRequestToJoin then joins directly instead of sending a request. Needs signedInName.
   */
  member?: boolean
  /** The club's name for the member sentence */
  clubName?: string
}

export const PLACEMENT_LABEL = 'How do you want to join?'
export const PLACEMENT_HINT =
  'A slot is yours once the Queue Master confirms. The waitlist keeps your place until a slot opens.'
export const PLACEMENT_FULL_HINT =
  'All slots are taken, so you join the waitlist. The Queue Master gives slots as they open.'

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
    | ({
        /**
         * Superseded (owner, November 11, 2026): join requests close at Start, so a live session
         * shows `started` instead. Kept until the public page moves over.
         */
        variant: 'active'
      } & AvailabilityProps)
    | {
        /** The club turned Accept join requests off: contact the Queue Master instead */
        variant: 'off'
      }
    | {
        /**
         * The session has started: online join requests are closed, for visitors and signed-in
         * players alike; the Queue Master adds late players at the venue
         */
        variant: 'started'
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
        /** The request's choice: "You asked to be waitlisted." for a waitlist request */
        placement?: JoinRequestPlacement
      }
    | { variant: 'confirmed-slot' }
    | {
        variant: 'confirmed-waitlist'
        /** 1-based position on the waitlist */
        waitlistPosition: number
        /** Signed-in player: "Ask the Queue Master about a slot." */
        signedIn?: boolean
        /**
         * Join from waitlist (D-2026-11-11-02), signed-in only: how many slots are open; with
         * onJoinFromWaitlist and at least one open slot the card offers the primary button.
         */
        openSlots?: number
        onJoinFromWaitlist?: () => void
        /** The player's slot request is waiting for the Queue Master: Cancel request instead */
        slotRequestPending?: boolean
        onCancelRequest?: () => void
        /** Offline or a send is in flight */
        disabled?: boolean
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
    case 'sent': {
      const waitlist = props.placement === 'waitlist'
      return {
        tone: 'warn',
        title: 'Request sent',
        text: `Thanks, ${props.name}. ${waitlist ? 'You asked to be waitlisted. ' : ''}The Queue Master confirms every ${props.onCancelRequest ? 'request' : 'guest'}, usually at the venue. Your ${waitlist ? 'place' : 'slot'} isn't held until they do.`,
      }
    }
    case 'confirmed-slot':
      return {
        tone: 'success',
        title: 'Confirmed · you have a slot',
        text: 'See you on court. Your name is now in Participants.',
      }
    case 'confirmed-waitlist': {
      const open = props.openSlots ?? 0
      const canAsk = props.signedIn && props.onJoinFromWaitlist && open > 0
      return {
        tone: 'success',
        title: `Confirmed · waitlist #${props.waitlistPosition}`,
        text: props.signedIn
          ? props.slotRequestPending
            ? "You're on the waitlist. You asked for a slot; the Queue Master confirms it."
            : canAsk
              ? `You're on the waitlist. ${open} slot${open === 1 ? ' is' : 's are'} open. Ask to join from the waitlist and the Queue Master confirms it.`
              : "You're on the waitlist. Ask the Queue Master about a slot."
          : "You're on the waitlist. The Queue Master gives slots in order as they open.",
      }
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
 * open or full with Request to join, off when the club is not taking requests online, started once
 * the session is live (online join requests closed), and the
 * visitor's own status afterwards: Request sent, Confirmed · you have a slot, Confirmed ·
 * waitlist #N, or Request not accepted. A request is never a booking.
 */
export function JoinRequestCard(props: JoinRequestCardProps) {
  const id = useId()
  const headingId = `${id}-h`
  // .join-card: the card keeps the accent border in every variant.
  const cardClass = cn('flex flex-col gap-3 border-accent', props.className)

  if (props.variant === 'off' || props.variant === 'started') {
    return (
      <Card asChild className={cardClass}>
        <section aria-label="Want to play?">
          <p className="m-0 text-[13px] text-fg2">
            {props.variant === 'started'
              ? 'The session has started, so online join requests are closed. Ask the Queue Master at the venue to add you.'
              : "This session isn't taking requests online. Contact the Queue Master to play."}
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
    // D-2026-11-11-02: Join a slot is unavailable while every slot is taken before start. During
    // play the Queue Master can admit additional players, so the "active" variant never disables it.
    const full = props.variant === 'full'
    // D-2026-11-12-02: a club member gets their place right away; no request copy.
    const member = !!props.signedInName && !!props.member && props.variant !== 'active'
    const waitlisting = full || props.placement === 'waitlist'
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
            {member
              ? `You're a member of ${props.clubName ?? 'this club'}, so you get your place right away.`
              : props.signedInName
                ? 'One tap sends your request and the Queue Master confirms it.'
                : 'Send a quick request and the Queue Master confirms it.'}
          </p>
          {props.signedInName && props.onPlacementChange ? (
            <div className="flex min-w-0 flex-col gap-1.5">
              <span id={`${id}-placement`} className="text-[13px] font-semibold text-fg2">
                {PLACEMENT_LABEL}
              </span>
              <ChoiceGroup
                type="single"
                aria-label={PLACEMENT_LABEL}
                disabled={props.disabled}
                choices={[
                  { value: 'slot', title: 'Join a slot', disabled: full },
                  { value: 'waitlist', title: 'Be waitlisted' },
                ]}
                value={full ? 'waitlist' : (props.placement ?? 'slot')}
                onChange={(value) =>
                  props.onPlacementChange?.(value === 'waitlist' ? 'waitlist' : 'slot')
                }
              />
              <span className="text-xs font-normal text-fg2">
                {full ? PLACEMENT_FULL_HINT : PLACEMENT_HINT}
              </span>
            </div>
          ) : null}
          <Button
            variant="primary"
            onClick={props.onRequestToJoin}
            disabled={props.disabled}
            className="min-h-11 w-full"
          >
            {member
              ? `${waitlisting ? 'Join the waitlist as' : 'Join as'} ${props.signedInName}`
              : props.signedInName
                ? `Request to join as ${props.signedInName}`
                : 'Request to join'}
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
        {props.registerNudge ? (
          <p className="m-0 text-[13px] text-fg2">Register to check in and see your matches.</p>
        ) : null}
        {(props.variant === 'sent' ||
          (props.variant === 'confirmed-waitlist' && props.slotRequestPending)) &&
        props.onCancelRequest ? (
          <Button
            variant="secondary"
            onClick={props.onCancelRequest}
            disabled={props.disabled}
            className="min-h-11 w-full"
          >
            Cancel request
          </Button>
        ) : null}
        {props.variant === 'confirmed-waitlist' &&
        props.signedIn &&
        !props.slotRequestPending &&
        props.onJoinFromWaitlist &&
        (props.openSlots ?? 0) > 0 ? (
          <Button
            variant="primary"
            onClick={props.onJoinFromWaitlist}
            disabled={props.disabled}
            className="min-h-11 w-full"
          >
            Join from waitlist
          </Button>
        ) : null}
      </section>
    </Card>
  )
}
