import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ChangeCompare } from '@rotra/ui/change-compare'
import { Chip } from '@rotra/ui/chip'
import { useId } from 'react'

export type NameChangeRequestCardProps = {
  currentName: string
  requestedName: string
  /** When the club sent the request (ISO or Date) */
  requestedAt: Date | string
  /** Opens the approve sheet; the buttons render only when both handlers are passed */
  onApprove?: () => void
  onReject?: () => void
  disabled?: boolean
  /** Reference time for "19 hours ago"; stories pass the fixture's now */
  now?: Date
}

const SENT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Manila',
})

/** The prototype's ago(): just now, 12 min ago, 19 hours ago, 3 days ago. */
function ago(at: Date, now: Date): string {
  const m = Math.round((now.getTime() - at.getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

/** Club detail › Overview: a club name change waiting for the platform owner. */
export function NameChangeRequestCard({
  currentName,
  requestedName,
  requestedAt,
  onApprove,
  onReject,
  disabled,
  now = new Date(),
}: NameChangeRequestCardProps) {
  const headingId = useId()
  const at = new Date(requestedAt)
  return (
    <Card asChild tone="warn">
      <section id="name-request" aria-labelledby={headingId} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id={headingId}>Name change requested</h2>
            <p className="m-0 text-[13px] text-fg2">
              Sent {SENT.format(at)} · {ago(at, now)}
            </p>
          </div>
          <Chip tone="warn">Waiting for you</Chip>
        </div>
        <ChangeCompare from={currentName} to={requestedName} />
        <p className="m-0 text-[13px] text-fg2">
          Until you approve, the club keeps its current name everywhere. The club can cancel the
          request from Club settings.
        </p>
        {onApprove && onReject ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" onClick={onReject} disabled={disabled}>
              Reject
            </Button>
            <Button size="sm" variant="primary" onClick={onApprove} disabled={disabled}>
              Approve name change
            </Button>
          </div>
        ) : null}
      </section>
    </Card>
  )
}
