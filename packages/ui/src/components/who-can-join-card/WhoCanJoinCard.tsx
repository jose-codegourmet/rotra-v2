'use client'

import { Card } from '@rotra/ui/card'
import { Switch } from '@rotra/ui/switch'
import { useId } from 'react'

export type WhoCanJoinCardProps = {
  /** The session's Accept join requests setting */
  acceptJoinRequests: boolean
  /**
   * The session's Always require a request setting (D-2026-11-12-02): on, club members send a join
   * request like everyone else. Disabled and read as off while Accept join requests is off.
   */
  alwaysRequireRequest: boolean
  onAcceptJoinRequestsChange: (accept: boolean) => void
  onAlwaysRequireRequestChange: (always: boolean) => void
  className?: string
}

/** The "Who can join" box beside Session link (Settings tab and Q-PREPARE): the two join switches. */
export function WhoCanJoinCard({
  acceptJoinRequests,
  alwaysRequireRequest,
  onAcceptJoinRequestsChange,
  onAlwaysRequireRequestChange,
  className,
}: WhoCanJoinCardProps) {
  const id = useId()
  const always = acceptJoinRequests && alwaysRequireRequest === true
  return (
    <Card asChild className={className}>
      <section id="who-can-join" aria-labelledby={`${id}-h`} className="flex flex-col gap-3">
        <div>
          <h2 id={`${id}-h`}>Who can join</h2>
          <p className="m-0 text-[13px] text-fg2">How people get a slot from the session link.</p>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="font-semibold">Accept join requests</b>
            <p className="m-0 text-[13px] text-fg2">
              {acceptJoinRequests
                ? 'Guests can request a slot from the public page.'
                : 'The public page says to contact the Queue Master instead.'}
            </p>
          </span>
          <Switch
            checked={acceptJoinRequests}
            onChange={onAcceptJoinRequestsChange}
            aria-label="Accept join requests"
          />
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="font-semibold">Always require a request</b>
            <p className="m-0 text-[13px] text-fg2">
              {always
                ? 'Club members send a join request too, like everyone else.'
                : 'Club members join upcoming sessions right away; guests still send a request.'}
            </p>
          </span>
          <Switch
            checked={always}
            disabled={!acceptJoinRequests}
            onChange={onAlwaysRequireRequestChange}
            aria-label="Always require a request"
          />
        </div>
      </section>
    </Card>
  )
}
