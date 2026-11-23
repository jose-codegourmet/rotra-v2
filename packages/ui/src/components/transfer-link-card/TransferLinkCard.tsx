'use client'

import type { TransferLinkState } from '@rotra/data/slot-transfer/slotTransfer.types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Notice } from '@rotra/ui/notice'
import { type ReactNode, useId } from 'react'

export type TransferLinkCardProps = {
  /** The link's state from this viewer's side (`TransferLinkView.state`) */
  state: TransferLinkState
  /** The sender's masked public name, e.g. "J*** L***"; null for an unknown link */
  senderName: string | null
  /** A ROTRA Player is signed in on this page */
  signedIn: boolean
  /** While `open` and signed in: why this viewer cannot claim (already has a slot here) */
  claimBlock?: string | null
  /** Not signed in: the Player app's registration for this session's link */
  registerHref?: string
  /** Not signed in: the Player app's login, back to this link */
  logInHref?: string
  onClaim?: () => void
  onWithdraw?: () => void
  pending?: boolean
  /** This device is offline: Claim and Withdraw are disabled */
  offline?: boolean
  className?: string
}

const OFFLINE = "You're offline. Reconnect and try again."

const CLOSED_COPY: Partial<Record<TransferLinkState, { title: string; body: string }>> = {
  claimed: {
    title: 'Someone else already claimed this transfer link.',
    body: 'Only the first person to claim a transfer link can. Ask the sender if they have another slot to give.',
  },
  own: {
    title: 'This is your own transfer link.',
    body: "Send it to the player who'll take your slot. You can cancel it on My night.",
  },
  closed: {
    title: 'This transfer link no longer works.',
    body: 'It was cancelled, withdrawn or rejected. Ask the sender for a new link.',
  },
  expired: {
    title: 'This transfer link has expired.',
    body: 'Transfer links stop working when the session starts.',
  },
  cancelled: {
    title: 'This session was cancelled.',
    body: 'The transfer link no longer works.',
  },
}

/**
 * Q-PUBLIC-JOIN › Transfer link (#1012, the prototype's transferLinkCard()): what a person who
 * opened `/s/<slug>?transfer=<token>` sees. Not signed in: sign up or log in to claim. Signed in:
 * Claim this slot (first claimant only), then “You claimed NAME's slot · the QM decides” with
 * Withdraw claim, or the slot is theirs once approved. Every closed state says why and what to do.
 */
export function TransferLinkCard({
  state,
  senderName,
  signedIn,
  claimBlock = null,
  registerHref,
  logInHref,
  onClaim,
  onWithdraw,
  pending = false,
  offline = false,
  className,
}: TransferLinkCardProps) {
  const id = useId()
  const sender = senderName ?? 'A player'
  const closed = CLOSED_COPY[state]
  let body: ReactNode
  if (closed)
    body = (
      <Notice tone="warn" title={closed.title}>
        {closed.body}
      </Notice>
    )
  else if (state === 'approved')
    body = (
      <Notice tone="success" title="The slot is yours.">
        The Queue Master approved the transfer. See you on court.
      </Notice>
    )
  else if (state === 'yours')
    body = (
      <>
        <p className="m-0 text-sm">
          You claimed {sender}&apos;s slot · the Queue Master decides before the session starts.
        </p>
        <p className="m-0 text-[13px] text-fg2">
          Withdrawing gives the slot back to {sender}, and this link stops working.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onWithdraw}
            disabled={pending || offline}
            title={offline ? OFFLINE : undefined}
          >
            Withdraw claim
          </Button>
        </div>
      </>
    )
  else if (!signedIn)
    body = (
      <>
        <p className="m-0 text-sm">
          Sign up or log in to ROTRA to claim it. The first person to claim it gets the slot once
          the Queue Master approves.
        </p>
        <div className="flex flex-wrap gap-2 max-sm:[&>*]:flex-1">
          {registerHref ? (
            <Button asChild variant="primary">
              <a href={registerHref}>Sign up to claim</a>
            </Button>
          ) : null}
          {logInHref ? (
            <Button asChild>
              <a href={logInHref}>Log in</a>
            </Button>
          ) : null}
        </div>
      </>
    )
  else if (claimBlock) body = <Notice tone="warn">{claimBlock}</Notice>
  else
    body = (
      <>
        <p className="m-0 text-sm">
          Claim it and the Queue Master decides before the session starts. Only the first person to
          claim this link can.
        </p>
        <div className="flex flex-wrap gap-2 max-sm:[&>*]:flex-1">
          <Button
            variant="primary"
            onClick={onClaim}
            loading={pending}
            disabled={pending || offline}
            title={offline ? OFFLINE : undefined}
          >
            Claim this slot
          </Button>
        </div>
      </>
    )
  return (
    <Card asChild className={className}>
      <section aria-labelledby={`${id}-h`} className="flex flex-col gap-3">
        <h2 id={`${id}-h`} className="m-0 text-base">
          {state === 'open' || state === 'yours' || state === 'approved'
            ? `${sender} wants to give you their slot`
            : 'Transfer link'}
        </h2>
        {body}
      </section>
    </Card>
  )
}
