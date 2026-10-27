'use client'

import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { Switch } from '@rotra/ui/switch'
import { TextInput } from '@rotra/ui/text-input'
import { useId } from 'react'

export type SessionLinkCardProps = {
  /** The full public session link, e.g. "https://rotra.app/s/sunday-night" */
  link: string
  /** Join requests still waiting for a decision; shows the warn chip when above zero */
  pendingCount: number
  /** The session's Accept join requests setting */
  acceptJoinRequests: boolean
  onCopyLink: () => void
  onOpenAsGuest: () => void
  onPreviewPublicPage: () => void
  onAcceptJoinRequestsChange: (accept: boolean) => void
  className?: string
}

/**
 * Preparation › Overview › Session link: the public link with Copy link, Open as a guest and
 * Preview public page, a "N join requests" chip while any wait, and the Accept join requests switch.
 */
export function SessionLinkCard({
  link,
  pendingCount,
  acceptJoinRequests,
  onCopyLink,
  onOpenAsGuest,
  onPreviewPublicPage,
  onAcceptJoinRequestsChange,
  className,
}: SessionLinkCardProps) {
  const id = useId()
  return (
    <Card asChild className={className}>
      <section id="session-link" aria-labelledby={`${id}-h`} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 basis-60">
            <h2 id={`${id}-h`}>Session link</h2>
            <p className="m-0 text-[13px] text-fg2">
              Share it in your Facebook post or group chat. Anyone with it sees the public page;
              guests can send a join request, and nobody gets a slot until you confirm them.
            </p>
          </div>
          {pendingCount > 0 ? (
            <Chip tone="warn">
              {pendingCount} join request{pendingCount > 1 ? 's' : ''}
            </Chip>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <TextInput
            readOnly
            value={link}
            aria-label="Session link"
            className="font-mono text-[13px]"
          />
          <Button size="sm" variant="primary" onClick={onCopyLink} className="flex-none whitespace-nowrap">
            Copy link
          </Button>
        </div>
        <div
          className={cn(
            'flex flex-wrap items-center gap-2',
            'max-sm:grid max-sm:w-full max-sm:grid-cols-2 max-sm:[&>*]:w-full',
          )}
        >
          <Button size="sm" onClick={onOpenAsGuest}>
            Open as a guest
          </Button>
          <Button size="sm" onClick={onPreviewPublicPage}>
            Preview public page
          </Button>
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
      </section>
    </Card>
  )
}
